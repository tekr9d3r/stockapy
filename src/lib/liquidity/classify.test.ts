import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildIndex,
  classifyPoolType,
  looksLikeStock,
  matchPool,
  parseFeeTier,
  type RegistryToken,
} from "./classify";

const NVDAX: RegistryToken = {
  chain: "Solana", address: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
  symbol: "NVDAx", underlying: "NVDA", issuer: "xstocks", name: "NVIDIA xStock",
};
const SPYX: RegistryToken = {
  chain: "Solana", address: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
  symbol: "SPYx", underlying: "SPY", issuer: "xstocks", name: "SP500 xStock",
};
const QQQX: RegistryToken = {
  chain: "Solana", address: "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ",
  symbol: "QQQx", underlying: "QQQ", issuer: "xstocks", name: "Nasdaq xStock",
};
const AMZNC: RegistryToken = {
  chain: "Base", address: "0xb200000000000000000000d9192b6B456483C2E8",
  symbol: "AMZNc", underlying: "AMZN", issuer: "coinbase", name: "Amazon.com Inc.",
};
const NVDA_HOOD: RegistryToken = {
  chain: "Robinhood Chain", address: "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec",
  symbol: "NVDA (Robinhood)", underlying: "NVDA", issuer: "robinhood", name: "NVIDIA • Robinhood Token",
};

const index = buildIndex([NVDAX, SPYX, QQQX, AMZNC, NVDA_HOOD]);
const tickers = new Set(["NVDA", "SPY", "QQQ", "AMZN", "AMD", "TSLA"]);
const USDC_SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

describe("matchPool: token address -> stock", () => {
  it("matches a registered Solana mint and classifies a stablecoin pair", () => {
    const r = matchPool({ chain: "Solana", symbol: "NVDAX-USDC", underlyingTokens: [NVDAX.address, USDC_SOL] }, index, tickers);
    assert.ok(r.match);
    assert.equal(r.match.matchedBy, "address");
    assert.equal(r.match.stockLegs[0].underlying, "NVDA");
    assert.equal(r.match.pairType, "stock-stable");
  });

  it("matches EVM addresses regardless of checksum casing", () => {
    const r = matchPool(
      { chain: "Base", symbol: "USDC-AMZNC", underlyingTokens: [USDC_BASE, AMZNC.address.toLowerCase()] },
      index, tickers,
    );
    assert.equal(r.match?.stockLegs[0].underlying, "AMZN");
    assert.equal(r.match?.pairType, "stock-stable");
  });

  it("does NOT match an imposter: right symbol, wrong mint", () => {
    // Shaped like the real case found while building the registry: a Solana
    // "AMDC" whose on-chain name is a USD stablecoin.
    const r = matchPool(
      { chain: "Solana", symbol: "AMDC-SOL", underlyingTokens: ["87T62igEvezNCctey74EadLsEAtDbCRvRiE6Ynia7KQU", "So11111111111111111111111111111111111111112"] },
      index, tickers,
    );
    assert.equal(r.match, null);
    assert.match(r.review ?? "", /looks like a stock/);
  });

  it("is chain-aware: the same address on another chain is not a match", () => {
    const r = matchPool({ chain: "Ethereum", symbol: "NVDAX-USDC", underlyingTokens: [NVDAX.address, USDC_SOL] }, index, tickers);
    assert.equal(r.match, null);
  });

  it("ignores ordinary pairs with no stock leg and does not flag them", () => {
    const r = matchPool({ chain: "Solana", symbol: "SOL-USDC", underlyingTokens: ["So11111111111111111111111111111111111111112", USDC_SOL] }, index, tickers);
    assert.equal(r.match, null);
    assert.equal(r.review, null);
  });

  it("still matches by address when a token symbol itself contains a hyphen", () => {
    // Real case: a 2-token Raydium pool listed as "TSLAX-ELON-SAN". Splitting the
    // symbol gives 3 parts for 2 addresses; the address must still win.
    const TSLAX = { ...NVDAX, address: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB", symbol: "TSLAx", underlying: "TSLA", name: "Tesla xStock" };
    const idx = buildIndex([TSLAX]);
    const r = matchPool(
      { chain: "Solana", symbol: "TSLAX-ELON-SAN", underlyingTokens: [TSLAX.address, "ELoNsan1111111111111111111111111111111111111"] },
      idx, tickers,
    );
    assert.equal(r.match?.matchedBy, "address");
    assert.equal(r.match?.legs.length, 2);
    assert.equal(r.match?.legs[1].symbol, "ELON-SAN");
    assert.equal(r.match?.pairType, "stock-other");
  });

  it("falls back to symbol only when the pool has no addresses", () => {
    const r = matchPool({ chain: "Solana", symbol: "NVDAx-USDC", underlyingTokens: null }, index, tickers);
    assert.equal(r.match?.matchedBy, "symbol");
    assert.equal(r.match?.stockLegs[0].underlying, "NVDA");
  });
});

describe("classifyPair: pair type", () => {
  it("stock / crypto", () => {
    const r = matchPool({ chain: "Solana", symbol: "NVDAX-WSOL", underlyingTokens: [NVDAX.address, "So11111111111111111111111111111111111111112"] }, index, tickers);
    assert.equal(r.match?.pairType, "stock-crypto");
  });
  it("stock / stock", () => {
    const r = matchPool({ chain: "Solana", symbol: "SPYX-QQQX", underlyingTokens: [SPYX.address, QQQX.address] }, index, tickers);
    assert.equal(r.match?.pairType, "stock-stock");
    assert.equal(r.match?.stockLegs.length, 2);
  });
  it("stock / memecoin is speculative", () => {
    const r = matchPool({ chain: "Solana", symbol: "NVDAX-STONK", underlyingTokens: [NVDAX.address, "STonk111111111111111111111111111111111111111"] }, index, tickers);
    assert.equal(r.match?.pairType, "stock-other");
  });
});

describe("looksLikeStock: review heuristics", () => {
  it("does not mistake USDC for a Coinbase stock", () => {
    assert.equal(looksLikeStock("USDC", "Base", tickers), false);
  });
  it("does not read VB as Visa or MAX as Mastercard when we do not track them", () => {
    assert.equal(looksLikeStock("VB", "Ethereum", tickers), false);
    assert.equal(looksLikeStock("MAX", "Hyperliquid L1", tickers), false);
  });
  it("recognises suffixed and wrapped stock symbols", () => {
    assert.equal(looksLikeStock("NVDAX", "Solana", tickers), true);
    assert.equal(looksLikeStock("TSLAON", "Ethereum", tickers), true);
    assert.equal(looksLikeStock("WNVDAX", "Mantle", tickers), true);
  });
  it("treats a plain ticker as a stock only on Robinhood Chain", () => {
    assert.equal(looksLikeStock("NVDA", "Robinhood Chain", tickers), true);
    assert.equal(looksLikeStock("NVDA", "Solana", tickers), false);
  });
});

describe("parseFeeTier and classifyPoolType", () => {
  it("parses the fee tier out of each venue's poolMeta format", () => {
    assert.equal(parseFeeTier("Concentrated - 0.1%"), 0.1);
    assert.equal(parseFeeTier("CL10 - 0.05%"), 0.05);
    assert.equal(parseFeeTier("0.3%"), 0.3);
    assert.equal(parseFeeTier("0.05% fee | CL range 1.26%"), 0.05);
    assert.equal(parseFeeTier(null), null);
    assert.equal(parseFeeTier("Uniswap V3"), null);
  });
  it("treats implausible tiers as unknown rather than as a fee", () => {
    assert.equal(parseFeeTier("80.00%"), null);
  });
  it("classifies concentrated vs full-range", () => {
    assert.equal(classifyPoolType("raydium-amm", "Concentrated - 1%"), "concentrated");
    assert.equal(classifyPoolType("raydium-amm", "Standard - 1.25%"), "full-range");
    assert.equal(classifyPoolType("aerodrome-slipstream", "CL10 - 0.05%"), "concentrated");
    assert.equal(classifyPoolType("orca-dex", null), "concentrated");
    assert.equal(classifyPoolType("uniswap-v2", null), "full-range");
    assert.equal(classifyPoolType("mystery-dex", null), "unknown");
  });
});
