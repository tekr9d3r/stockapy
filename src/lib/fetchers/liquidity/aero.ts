import { createPublicClient, erc20Abi, http, parseAbi, type Address } from "viem";
import { legsFromTokens, normAddress, type RegistryToken } from "@/lib/liquidity/classify";
import { depositUrl, poolChartUrl } from "@/lib/liquidity/venues";
import type { LiquidityPool, ReviewPool } from "@/lib/liquidity/types";

/**
 * Aero pools, read on-chain from Aero's LP Sugar contract: the same contract the
 * Aero app reads to draw its pools page. One call returns every pool's reserves,
 * swap volume and fees over a trailing window, fee settings and gauge emissions.
 *
 * Sugar only knows pools created since the 21 Oct 2026 merger. Older Aerodrome
 * and Velodrome pools still come from GeckoTerminal.
 */
const SUGAR: Record<string, { rpc: string; address: Address; llama: string; gecko: string }> = {
  Base: {
    rpc: "https://mainnet.base.org",
    address: "0xb2A7bDB79FbE254DdAeB151c9ff7649bddad48E5",
    llama: "base",
    gecko: "base",
  },
  "Robinhood Chain": {
    rpc: "https://rpc.mainnet.chain.robinhood.com",
    address: "0x471C34138D06001AEe399af9EBEbbdF680b966B3",
    llama: "robinhood",
    gecko: "robinhood",
  },
};

const ABI = parseAbi([
  "struct Lp { address lp; string symbol; uint8 decimals; uint256 liquidity; int24 poolType; int24 tick; uint160 sqrtRatio; address token0; uint256 reserve0; uint256 staked0; address token1; uint256 reserve1; uint256 staked1; address gauge; uint256 gaugeLiquidity; bool gaugeAlive; address rewardsManager; address factory; uint256 emissions; address emissionsToken; uint128 emissionsCap; uint256 poolFee; uint256 unstakedFee; uint256 token0Fees; uint256 token1Fees; uint48 createdAt; address nfpm; uint48 windowStart; uint48 windowEnd; int24 windowOpenTick; int24 windowCloseTick; uint256 windowSwapCount; uint256 windowVolume0; uint256 windowVolume1; uint256 windowFee0; uint256 windowFee1; uint256 windowMevVolume0; uint256 windowMevVolume1; uint256 windowMevFee0; uint256 windowMevFee1; }",
  "function all(uint256 _limit, uint256 _offset, uint48 _window, uint8 _filter) external view returns (Lp[] memory _lps)",
  "function count() external view returns (uint256)",
]);

type Lp = {
  lp: Address;
  poolType: number;
  token0: Address;
  reserve0: bigint;
  staked0: bigint;
  token1: Address;
  reserve1: bigint;
  staked1: bigint;
  gaugeAlive: boolean;
  emissions: bigint;
  emissionsToken: Address;
  poolFee: bigint;
  unstakedFee: bigint;
  windowStart: number;
  windowEnd: number;
  windowVolume0: bigint;
  windowVolume1: bigint;
  windowFee0: bigint;
  windowFee1: bigint;
};

/** The trailing window we ask for: one day, so volume means 24h volume. */
const WINDOW_SECONDS = 86_400;
const PAGE_SIZE = BigInt(300);
const YEAR_SECONDS = 31_536_000;
/** Sugar's `all()` filter: 0 = every pool, listed or not. */
const FILTER_ALL = 0;
/** Fee settings are in millionths on concentrated pools. */
const PIPS = 1_000_000;

type TokenInfo = { symbol: string; decimals: number };

export async function fetchAeroSugar(
  index: Map<string, RegistryToken>,
  fetchedAt: string,
): Promise<{ pools: LiquidityPool[]; review: ReviewPool[] }> {
  const pools: LiquidityPool[] = [];
  const review: ReviewPool[] = [];
  for (const [chain, cfg] of Object.entries(SUGAR)) {
    const r = await fetchChain(chain, cfg, index, fetchedAt);
    pools.push(...r.pools);
    review.push(...r.review);
  }
  return { pools, review };
}

async function fetchChain(
  chain: string,
  cfg: (typeof SUGAR)[string],
  index: Map<string, RegistryToken>,
  fetchedAt: string,
) {
  const client = createPublicClient({ transport: http(cfg.rpc, { retryCount: 3 }) });
  const total = await client.readContract({ address: cfg.address, abi: ABI, functionName: "count" });

  const lps: Lp[] = [];
  for (let offset = BigInt(0); offset < total; offset += PAGE_SIZE) {
    const page = await client.readContract({
      address: cfg.address,
      abi: ABI,
      functionName: "all",
      args: [PAGE_SIZE, offset, WINDOW_SECONDS, FILTER_ALL],
    });
    lps.push(...(page as readonly Lp[]));
  }

  const isStock = (a: string) => index.has(`${chain}:${normAddress(a)}`);
  const stockLps = lps.filter((p) => isStock(p.token0) || isStock(p.token1));

  // Symbols and decimals straight from each token contract, so a pool's legs read
  // exactly as they do on-chain. Emission tokens are priced too.
  const addresses = [
    ...new Set(stockLps.flatMap((p) => [p.token0, p.token1, ...(p.gaugeAlive ? [p.emissionsToken] : [])]).map(normAddress)),
  ] as Address[];
  const info = new Map<string, TokenInfo>();
  await Promise.all(
    addresses.map(async (a) => {
      const [symbol, decimals] = await Promise.all([
        client.readContract({ address: a, abi: erc20Abi, functionName: "symbol" }),
        client.readContract({ address: a, abi: erc20Abi, functionName: "decimals" }),
      ]);
      info.set(a, { symbol, decimals });
    }),
  );
  const prices = await fetchPrices(cfg.llama, cfg.gecko, addresses);

  const nowSeconds = Math.floor(Date.parse(fetchedAt) / 1000);
  const pools: LiquidityPool[] = [];
  const review: ReviewPool[] = [];
  for (const p of stockLps) {
    const [a0, a1] = [normAddress(p.token0), normAddress(p.token1)];
    const [t0, t1] = [info.get(a0)!, info.get(a1)!];
    const symbol = `${t0.symbol} / ${t1.symbol}`;
    const [p0, p1] = [prices.get(a0), prices.get(a1)];
    if (p0 === undefined || p1 === undefined) {
      // No guessing a price: a pool we cannot value is not listed.
      review.push({ venue: "aero", chain, symbol, address: p.lp, reason: "no USD price for one leg" });
      continue;
    }
    const built = legsFromTokens(chain, [{ address: p.token0, symbol: t0.symbol }, { address: p.token1, symbol: t1.symbol }], index);
    if (!built) continue;

    const usd0 = (x: bigint) => (Number(x) / 10 ** t0.decimals) * p0;
    const usd1 = (x: bigint) => (Number(x) / 10 ** t1.decimals) * p1;
    const concentrated = p.poolType > 0;

    // The same arithmetic as the Aero app. Sugar counts each swap's volume on
    // both legs, so the USD volume is the average of the two sides.
    const tvl = usd0(p.reserve0) + usd1(p.reserve1);
    // windowEnd is the last swap, so a quiet pool's window can shrink to minutes
    // and annualise a single trade into a huge rate. Nothing traded between the
    // last swap and now, so measure the period up to now instead. windowStart is
    // the oldest history the pool's oracle holds, at most a day back.
    const windowSeconds = Math.max(0, Math.max(p.windowEnd, nowSeconds) - p.windowStart);
    const volume = usd0(p.windowVolume0) / 2 + usd1(p.windowVolume1) / 2;
    const fees = usd0(p.windowFee0) + usd1(p.windowFee1);
    const annualFees = windowSeconds > 0 ? (fees * YEAR_SECONDS) / windowSeconds : 0;

    // Unstaked LPs in concentrated pools keep (1 - unstakedFee) of the fees; the
    // rest goes to sAERO Token Operators. Staked LPs take AERO instead of fees.
    const lpFeeShare = concentrated ? 1 - Number(p.unstakedFee) / PIPS : 1;
    const gross = tvl > 0 ? (annualFees / tvl) * 100 : null;
    const net = gross === null ? null : gross * lpFeeShare;
    const windowHours = windowSeconds / 3600;
    const young = windowHours < 23.5;

    let emissions: LiquidityPool["emissions"] = null;
    const et = normAddress(p.emissionsToken);
    const ep = prices.get(et);
    const einfo = info.get(et);
    if (p.gaugeAlive && p.emissions > BigInt(0) && ep !== undefined && einfo) {
      const perSecondUsd = (Number(p.emissions) / 10 ** einfo.decimals) * ep;
      const stakedUsd = usd0(p.staked0) + usd1(p.staked1);
      emissions = {
        token: einfo.symbol,
        usdPerDay: perSecondUsd * 86_400,
        stakedUsd,
        venueApr: stakedUsd > 0 ? ((perSecondUsd * YEAR_SECONDS) / stakedUsd) * 100 : null,
      };
    }

    const sharePct = Math.round((1 - lpFeeShare) * 1000) / 10;
    const feeNote =
      `Trading fees over the last ${young ? `${windowHours.toFixed(1)} hours (all the on-chain history Aero holds for this pool so far)` : "24 hours"}, ` +
      `annualised, over the pool's full TVL` +
      (concentrated
        ? `, after the ${sharePct}% Aero sends to sAERO Token Operators. Aero's own "Fees APR" divides by ` +
          `the liquidity near the current price only, so it shows higher. LPs who stake for AERO give these fees up.`
        : `. LPs who stake for AERO give these fees up.`) +
      (young ? " With this little history the rate is very noisy." : "");

    pools.push({
      id: `aero:${chain}:${normAddress(p.lp)}`,
      address: p.lp,
      venueId: "aero",
      variant: concentrated ? `CL${p.poolType}` : p.poolType === 0 ? "Stable" : "Volatile",
      chain,
      symbol,
      legs: built.legs.map((l) => ({
        symbol: l.symbol,
        address: l.address,
        stock: l.stock ? { symbol: l.stock.symbol, underlying: l.stock.underlying, issuer: l.stock.issuer } : null,
      })),
      underlyings: [...new Set(built.stockLegs.map((s) => s.underlying))],
      issuers: [...new Set(built.stockLegs.map((s) => s.issuer))],
      pairType: built.pairType,
      poolType: concentrated ? "concentrated" : "full-range",
      // Concentrated pools use a dynamic fee, so this is the rate right now. The
      // basic-pool unit is unconfirmed (no basic stock pool exists yet), so blank.
      feeTier: concentrated ? Number(p.poolFee) / (PIPS / 100) : null,
      apyBase: net,
      apyBaseGross: gross,
      lpFeeShare,
      apyReward: null,
      apyBase7d: null,
      tvlUsd: tvl,
      volumeUsd1d: volume,
      volumeUsd7d: null,
      volumeWindowHours: young ? Math.round(windowHours * 10) / 10 : null,
      emissions,
      feeNote,
      url: depositUrl("aero", chain, p.lp),
      chartUrl: poolChartUrl(chain, p.lp),
      source: "aero-sugar",
      fetchedAt,
    });
  }
  return { pools, review };
}

/** USD prices: DefiLlama first, GeckoTerminal for anything it does not price. */
async function fetchPrices(llamaChain: string, geckoNet: string, addresses: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (addresses.length === 0) return out;

  const keys = addresses.map((a) => `${llamaChain}:${a}`).join(",");
  const res = await fetch(`https://coins.llama.fi/prices/current/${keys}`);
  if (res.ok) {
    const body = (await res.json()) as { coins: Record<string, { price: number }> };
    for (const [k, v] of Object.entries(body.coins ?? {})) {
      if (Number.isFinite(v.price) && v.price > 0) out.set(normAddress(k.split(":")[1]), v.price);
    }
  }

  const missing = addresses.filter((a) => !out.has(a));
  for (let i = 0; i < missing.length; i += 30) {
    const chunk = missing.slice(i, i + 30);
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/simple/networks/${geckoNet}/token_price/${chunk.join(",")}`,
      { headers: { accept: "application/json" } },
    );
    if (!r.ok) continue;
    const body = (await r.json()) as { data?: { attributes?: { token_prices?: Record<string, string | null> } } };
    for (const [a, v] of Object.entries(body.data?.attributes?.token_prices ?? {})) {
      const n = Number(v);
      if (v !== null && Number.isFinite(n) && n > 0) out.set(normAddress(a), n);
    }
  }
  return out;
}
