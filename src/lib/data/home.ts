import chainLogos from "../../../data/chain-logos.json";
import { borrowRows, borrowStats, getRows, marketStats } from "./rows";
import { getLiquidityRows, isDefaultVisible, isShortWindow, liquidityStats, stockPageTickers, type LiquidityRow } from "./liquidity";
import { loadAssets } from "./assets";
import { loadSeed } from "./seed";
import { VENUES } from "@/lib/liquidity/venues";
import type { Row } from "./types";

/** Liquidity picks must be deep enough for their rate to mean something. */
const DEEP_POOL_USD = 250_000;
/** How many picks each category shows on the home page. */
const TOP_N = 5;

/**
 * The top n by the order given, at most one per key first, so three picks show
 * three platforms rather than one platform three times. Falls back to repeats
 * only when there are not enough distinct keys.
 */
function diverse<T>(sorted: T[], key: (x: T) => string, n: number): T[] {
  const seen = new Set<string>();
  const first = sorted.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)));
  return [...first, ...sorted.filter((x) => !first.includes(x))].slice(0, n);
}

export type HomeData = ReturnType<typeof getHomeData>;

/** Everything the home page shows, computed once per revalidation. */
export function getHomeData() {
  const rows = getRows();
  const earn = marketStats(rows);
  const borrowAll = borrowRows(rows);
  const borrow = borrowStats(borrowAll);
  const lqRows = getLiquidityRows();
  const lq = liquidityStats(lqRows);

  const liveEarn = rows.filter((r) => r.status === "live" && r.category === "earn" && !r.unmeasured);
  // Picks: varied across platforms first, then back in rank order for display.
  const topEarn = diverse(
    [...liveEarn].filter((r) => (r.apyTotal ?? 0) > 0).sort((a, b) => (b.apyTotal ?? 0) - (a.apyTotal ?? 0)),
    (r) => r.platform.id,
    TOP_N,
  ).sort((a, b) => (b.apyTotal ?? 0) - (a.apyTotal ?? 0));

  const deepPools = lqRows
    .filter((r) => isDefaultVisible(r) && r.apyBase !== null && !isShortWindow(r) && r.tvlUsd >= DEEP_POOL_USD)
    .sort((a, b) => b.apyBase! - a.apyBase!);
  // One pool per stock, so five picks are five different stocks.
  const topLiquidity = diverse(deepPools, (r) => r.underlyings.join(","), TOP_N).sort((a, b) => b.apyBase! - a.apyBase!);

  // Cheapest interest first: for a borrower, a lower rate is the better deal.
  // Markets with no published rate can't be ranked on cost, so they come last.
  const byCost = (x: Row, y: Row) =>
    (x.borrow!.borrowApr ?? Infinity) - (y.borrow!.borrowApr ?? Infinity) || (y.borrow!.ltv ?? 0) - (x.borrow!.ltv ?? 0);
  const topBorrow = diverse(
    borrowAll.filter((r) => r.borrow?.ltv != null).sort(byCost),
    (r) => r.platform.id,
    TOP_N,
  ).sort(byCost);

  // One entry per stock with a page (a live market), ranked by activity.
  const assets = new Map(loadAssets().map((a) => [a.ticker, a]));
  const stocks = [...stockPageTickers()]
    .filter((t) => assets.has(t))
    .map((t) => {
      const earnHere = liveEarn.filter((r) => r.underlying.ticker === t);
      const poolsHere = lqRows.filter((r) => r.underlyings.includes(t) && r.pairType !== "stock-other");
      const deep = poolsHere.filter((r) => deepPools.includes(r)).map((r) => r.apyBase!);
      // No $250k+ pool: fall back to the best stablecoin pool with a full day of data.
      const fullDay = poolsHere
        .filter((r) => isDefaultVisible(r) && r.apyBase !== null && !isShortWindow(r))
        .map((r) => r.apyBase!);
      const b = borrowAll.filter((r) => r.underlying.ticker === t).map((r) => r.borrow?.ltv ?? 0);
      const poolVolume = poolsHere.reduce((s, r) => s + r.volumeUsd1d, 0);
      const earnTvl = earnHere.reduce((s, r) => s + (r.tvlUsd ?? 0), 0);
      return {
        ticker: t,
        name: assets.get(t)!.name,
        type: assets.get(t)!.type,
        bestEarn: earnHere.length ? Math.max(...earnHere.map((r) => r.apyTotal ?? 0)) : null,
        bestFee: deep.length ? Math.max(...deep) : fullDay.length ? Math.max(...fullDay) : null,
        maxLtv: b.length && Math.max(...b) > 0 ? Math.max(...b) : null,
        markets: earnHere.length + poolsHere.length + b.length,
        pools: poolsHere.length,
        poolVolume,
        /** For ranking: money moving through this stock's markets. */
        activity: poolVolume + earnTvl,
      };
    })
    .sort((a, b) => b.activity - a.activity || b.markets - a.markets);

  // Proof of coverage: everything we read data from, with logos.
  const seed = loadSeed();
  const usedPlatformIds = new Set([...rows.filter((r) => r.status === "live").map((r) => r.platform.id)]);
  const platforms = [
    ...seed.platforms.filter((p) => usedPlatformIds.has(p.id)).map((p) => ({ id: p.id, name: p.name })),
    ...[...new Set(lqRows.map((r) => r.venueId))].map((id) => ({ id, name: VENUES[id].name })),
  ];
  const usedIssuers = new Set([...rows.map((r) => r.issuer.id), ...lqRows.flatMap((r) => r.issuers)]);
  const issuers = seed.issuers.filter((i) => usedIssuers.has(i.id)).map((i) => ({ id: i.id, name: i.name }));
  const knownChains = chainLogos as Record<string, string>;
  // "BSC" and "BNB Chain" are the same chain under two names.
  const chainName = (c: string) => (c === "BSC" ? "BNB Chain" : c);
  const chains = [...new Set([...rows.map((r) => r.chain), ...lqRows.map((r) => r.chain)].map(chainName))]
    .filter((c) => knownChains[c])
    .sort();

  return {
    earn,
    borrow,
    lq,
    topEarn,
    topLiquidity,
    topBorrow,
    stocks,
    platforms,
    issuers,
    chains,
    counts: {
      earn: earn.earnCount,
      liquidity: lq.allCount,
      borrow: borrow.count,
      markets: earn.earnCount + lq.allCount + borrow.count,
    },
  };
}

export type { LiquidityRow, Row };
