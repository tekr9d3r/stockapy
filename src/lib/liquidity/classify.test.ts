import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, classifyPoolType, legsFromTokens, parseFeeTier, type RegistryToken } from "./classify";
import { grossFeeApy, raydiumLpShare } from "./fees";
import { depositUrl, venueForDex } from "./venues";

const NVDAX: RegistryToken = {
  chain: "Solana", address: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
  symbol: "NVDAx", underlying: "NVDA", issuer: "xstocks", name: "NVIDIA xStock",
};
const NVDA_HOOD: RegistryToken = {
  chain: "Robinhood Chain", address: "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec",
  symbol: "NVDA (Robinhood)", underlying: "NVDA", issuer: "robinhood", name: "NVIDIA • Robinhood Token",
};
const SPY_HOOD: RegistryToken = {
  chain: "Robinhood Chain", address: "0x117cc2133c37b721f49de2a7a74833232b3b4c0c",
  symbol: "SPY (Robinhood)", underlying: "SPY", issuer: "robinhood", name: "SPDR S&P 500 ETF Trust • Robinhood Token",
};
const index = buildIndex([NVDAX, NVDA_HOOD, SPY_HOOD]);
const USDC_SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDG_HOOD = "0x5fc5360d0400a0fd4f2af552add042d716f1d168";

describe("legsFromTokens: token address -> stock", () => {
  it("matches a registered Solana mint and classifies a stablecoin pair", () => {
    const r = legsFromTokens("Solana", [{ address: NVDAX.address, symbol: "NVDAx" }, { address: USDC_SOL, symbol: "USDC" }], index);
    assert.equal(r?.stockLegs[0].underlying, "NVDA");
    assert.equal(r?.pairType, "stock-stable");
  });

  it("matches EVM addresses regardless of checksum casing", () => {
    const r = legsFromTokens(
      "Robinhood Chain",
      [{ address: "0xD0601CE157DB5BDC3162BBAC2A2C8AF5320D9EEC", symbol: "NVDA" }, { address: USDG_HOOD, symbol: "USDG" }],
      index,
    );
    assert.equal(r?.stockLegs[0].underlying, "NVDA");
  });

  it("rejects an imposter: a stock symbol on an unregistered address", () => {
    // Shaped like the real case: a Solana "AMDC" whose on-chain name is a USD stablecoin.
    const r = legsFromTokens(
      "Solana",
      [{ address: "87T62igEvezNCctey74EadLsEAtDbCRvRiE6Ynia7KQU", symbol: "AMDC" }, { address: USDC_SOL, symbol: "USDC" }],
      index,
    );
    assert.equal(r, null);
  });

  it("is chain-aware: a registered address on another chain does not match", () => {
    const r = legsFromTokens("Base", [{ address: NVDA_HOOD.address, symbol: "NVDA" }, { address: USDG_HOOD, symbol: "USDG" }], index);
    assert.equal(r, null);
  });

  it("classifies stock / stock, stock / crypto and speculative pairs", () => {
    const ss = legsFromTokens("Robinhood Chain", [{ address: SPY_HOOD.address, symbol: "SPY" }, { address: NVDA_HOOD.address, symbol: "NVDA" }], index);
    assert.equal(ss?.pairType, "stock-stock");
    assert.equal(ss?.stockLegs.length, 2);
    const sc = legsFromTokens("Robinhood Chain", [{ address: NVDA_HOOD.address, symbol: "NVDA" }, { address: "0xweth", symbol: "WETH" }], index);
    assert.equal(sc?.pairType, "stock-crypto");
    const so = legsFromTokens("Solana", [{ address: NVDAX.address, symbol: "NVDAx" }, { address: "STonk1", symbol: "STONK" }], index);
    assert.equal(so?.pairType, "stock-other");
  });
});

describe("venueForDex: GeckoTerminal dex ids", () => {
  it("maps Uniswap versions", () => {
    assert.deepEqual(venueForDex("uniswap-v3-robinhood"), { venue: "uniswap", variant: "v3" });
    assert.deepEqual(venueForDex("uniswap-v4-base"), { venue: "uniswap", variant: "v4" });
  });
  it("counts pre-merger Aerodrome pools as Aero", () => {
    assert.deepEqual(venueForDex("aero-base"), { venue: "aero", variant: null });
    assert.equal(venueForDex("aerodrome-slipstream-3")?.venue, "aero");
    assert.match(venueForDex("aerodrome-slipstream-3")?.variant ?? "", /pre-merger/);
  });
  it("ignores venues outside the three", () => {
    assert.equal(venueForDex("ramses-v3-robinhood"), null);
    assert.equal(venueForDex("o1-launchpad"), null);
    assert.equal(venueForDex("hydrex-integral"), null);
  });
});

describe("depositUrl: verified link formats", () => {
  it("Raydium: CLMM and Standard pools use different pages", () => {
    assert.equal(depositUrl("raydium", "Solana", "POOL", "Concentrated"), "https://raydium.io/clmm/create-position/?pool_id=POOL");
    assert.equal(depositUrl("raydium", "Solana", "POOL", "Standard"), "https://raydium.io/liquidity/increase/?mode=add&pool_id=POOL");
  });
  it("Uniswap uses its own chain slugs", () => {
    assert.equal(depositUrl("uniswap", "Robinhood Chain", "0xabc"), "https://app.uniswap.org/explore/pools/robinhood/0xabc");
    assert.equal(depositUrl("uniswap", "BSC", "0xabc"), "https://app.uniswap.org/explore/pools/bnb/0xabc");
  });
  it("Aero uses chainId-address", () => {
    assert.equal(depositUrl("aero", "Base", "0xabc"), "https://app.aero.xyz/deposit/8453-0xabc");
    assert.equal(depositUrl("aero", "Robinhood Chain", "0xabc"), "https://app.aero.xyz/deposit/4663-0xabc");
  });
});

describe("fees", () => {
  it("Raydium LPs keep 84% after the 12% protocol and 4% fund cuts", () => {
    assert.equal(raydiumLpShare({ protocolFeeRate: 120_000, fundFeeRate: 40_000 }), 0.84);
    assert.equal(raydiumLpShare(undefined), null);
  });
  it("grossFeeApy reproduces Raydium's own NVDAx/USDC figure from volume and tier", () => {
    // Live values: 0.1% tier, $2,493,796 volume, $3,169,112 TVL -> Raydium reported 28.72%.
    const v = grossFeeApy(0.1, 2_493_796, 3_169_112)!;
    assert.ok(Math.abs(v - 28.72) < 0.01, `got ${v}`);
  });
  it("grossFeeApy refuses to compute without a tier or TVL", () => {
    assert.equal(grossFeeApy(null, 1000, 1000), null);
    assert.equal(grossFeeApy(0.3, 1000, 0), null);
  });
});

describe("parseFeeTier and classifyPoolType", () => {
  it("parses the fee tier from GeckoTerminal pool names and venue metadata", () => {
    assert.equal(parseFeeTier("NVDA / USDG 0.05%"), 0.05);
    assert.equal(parseFeeTier("NVDAc / USDC 0.103%"), 0.103);
    assert.equal(parseFeeTier("NVDA / USDG"), null);
    assert.equal(parseFeeTier("80.00%"), null);
  });
  it("classifies concentrated vs full-range", () => {
    assert.equal(classifyPoolType("raydium-amm", "Concentrated"), "concentrated");
    assert.equal(classifyPoolType("raydium-amm", "Standard"), "full-range");
    assert.equal(classifyPoolType("uniswap-v3", null), "concentrated");
    assert.equal(classifyPoolType("uniswap-v2", null), "full-range");
  });
});
