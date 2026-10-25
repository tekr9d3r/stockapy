import path from "node:path";
import { REFRESH_INTERVAL_SECONDS } from "@/config";
import { getRows } from "./rows";
import { readJsonCached } from "./fileCache";
import { VENUES, type Venue } from "@/lib/liquidity/venues";
import type { LiquidityFile, LiquidityPool } from "@/lib/liquidity/types";

const FILE = path.join(process.cwd(), "data", "snapshots", "liquidity.json");
const STALE_AFTER_MS = REFRESH_INTERVAL_SECONDS * 2 * 1000;

export type LiquidityRow = LiquidityPool & {
  venue: Venue;
  /** Fees to LPs plus incentives. Null when the fee part is not published. */
  apyTotal: number | null;
  /** True when incentives are more than half the rate. */
  mostlyIncentives: boolean;
  /** 24h volume ÷ TVL: how hard the liquidity is working. */
  volumeToTvl: number;
  /** The underlyings that have their own stock page, so the table can link them. */
  linkable: string[];
  stale: boolean;
};

export function loadLiquidityFile(): LiquidityFile | null {
  return readJsonCached<LiquidityFile>(FILE);
}

/**
 * Tickers that get a stock page: any with a deposit or borrow market, plus any
 * with an active liquidity pool (the activity rule the pool list already
 * applies). Stocks with neither stay in the registry without a page, so there
 * are no empty pages. Used by the pages, sitemap, llms.txt, API and Markdown.
 */
export function stockPageTickers(): Set<string> {
  const tickers = new Set(getRows().map((r) => r.underlying.ticker));
  for (const p of loadLiquidityFile()?.pools ?? []) for (const t of p.underlyings) tickers.add(t);
  return tickers;
}

function toRow(p: LiquidityPool, now: number, pages: Set<string>): LiquidityRow {
  // Aero LPs take the fees or the gauge emissions, never both, so there is no
  // single total to add up.
  const eitherOr = Boolean(p.emissions);
  const apyTotal = p.apyBase === null || eitherOr ? null : p.apyBase + (p.apyReward ?? 0);
  return {
    ...p,
    venue: VENUES[p.venueId],
    apyTotal,
    mostlyIncentives: apyTotal !== null && apyTotal > 0 && (p.apyReward ?? 0) / apyTotal > 0.5,
    volumeToTvl: p.tvlUsd > 0 ? p.volumeUsd1d / p.tvlUsd : 0,
    linkable: p.underlyings.filter((t) => pages.has(t)),
    stale: now - Date.parse(p.fetchedAt) > STALE_AFTER_MS,
  };
}

/**
 * Fee APY first, full-day rates ahead of rates from only a few hours of trading;
 * pools with no fee figure sort by volume after them.
 */
export function sortLiquidity(rows: LiquidityRow[]): LiquidityRow[] {
  const rank = (r: LiquidityRow) => (r.apyBase === null ? 2 : isShortWindow(r) ? 1 : 0);
  return [...rows].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.apyBase !== null && b.apyBase !== null) return b.apyBase - a.apyBase;
    return b.volumeUsd1d - a.volumeUsd1d;
  });
}

export function getLiquidityRows(): LiquidityRow[] {
  const now = Date.now();
  const pages = stockPageTickers();
  return sortLiquidity((loadLiquidityFile()?.pools ?? []).map((p) => toRow(p, now, pages)));
}

export function liquidityRowsForTicker(ticker: string): LiquidityRow[] {
  const t = ticker.toUpperCase();
  return getLiquidityRows().filter((r) => r.underlyings.includes(t));
}

/** What a visitor sees before touching a filter: stock/stablecoin pairs. */
export function isDefaultVisible(r: LiquidityRow): boolean {
  return r.pairType === "stock-stable";
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** True when the volume and fee figures cover less than a full day of trading. */
export function isShortWindow(r: Pick<LiquidityPool, "volumeWindowHours">): boolean {
  return r.volumeWindowHours != null;
}

/**
 * Headline numbers over the default view. The fee figures cover only pools whose
 * fee APY to LPs is known over a full day: a rate annualised from a few hours of
 * trading is too noisy to headline, though it is listed in the table, flagged.
 * Every pool counts towards volume and TVL.
 */
export function liquidityStats(rows: LiquidityRow[] = getLiquidityRows()) {
  const set = rows.filter(isDefaultVisible);
  const withFee = set.filter((r) => r.apyBase !== null && !isShortWindow(r));
  const deep = withFee.filter((r) => r.tvlUsd >= 250_000);
  return {
    poolCount: set.length,
    allCount: rows.length,
    speculativeCount: rows.filter((r) => r.pairType === "stock-other").length,
    chains: [...new Set(set.map((r) => r.chain))].sort(),
    venues: [...new Set(set.map((r) => r.venue.name))].sort(),
    feePoolCount: withFee.length,
    /** Default-view pools with a fee APY measured over less than a day. */
    shortWindowCount: set.filter((r) => r.apyBase !== null && isShortWindow(r)).length,
    medianFeeApy: median(withFee.map((r) => r.apyBase!)),
    tvlUsd: set.reduce((s, r) => s + r.tvlUsd, 0),
    volumeUsd1d: set.reduce((s, r) => s + r.volumeUsd1d, 0),
    /** Best LP fee APY among pools deep enough for the rate to mean something. */
    bestFeeLiquid: [...deep].sort((a, b) => b.apyBase! - a.apyBase!)[0] ?? null,
    /** The single busiest pool by 24h volume. */
    busiest: [...set].sort((a, b) => b.volumeUsd1d - a.volumeUsd1d)[0] ?? null,
  };
}
