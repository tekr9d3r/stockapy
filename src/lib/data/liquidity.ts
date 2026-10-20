import fs from "node:fs";
import path from "node:path";
import { REFRESH_INTERVAL_SECONDS } from "@/config";
import { VENUES, venueVariant, type Venue } from "@/lib/liquidity/venues";
import type { LiquidityFile, LiquidityPool } from "@/lib/liquidity/types";

const FILE = path.join(process.cwd(), "data", "snapshots", "liquidity.json");

/** Pools below this are hidden by default: thin pools show absurd rates. */
export const DEFAULT_MIN_TVL = 10_000;
const STALE_AFTER_MS = REFRESH_INTERVAL_SECONDS * 2 * 1000;

const VENUE_BY_ID = new Map(Object.values(VENUES).map((v) => [v.id, v]));

export type LiquidityRow = LiquidityPool & {
  venue: Venue;
  /** e.g. "v3", "Slipstream". */
  variant: string | null;
  apyTotal: number | null;
  /** Fees ÷ total. Null when either is unknown. */
  feeShare: number | null;
  /** True when incentives are more than half the rate. */
  mostlyIncentives: boolean;
  /** 24h volume ÷ TVL: how hard the liquidity is working. */
  volumeToTvl: number | null;
  url: string;
  /** DefiLlama's page for this exact pool. Always exact: it is the id we query. */
  chartUrl: string;
  stale: boolean;
};

export function loadLiquidityFile(): LiquidityFile | null {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as LiquidityFile;
  } catch {
    return null;
  }
}

function toRow(p: LiquidityPool, now: number): LiquidityRow {
  const venue = VENUE_BY_ID.get(p.venueId) ?? { id: p.venueId, name: p.venueId, website: "" };
  const base = p.apyBase;
  const reward = p.apyReward;
  const apyTotal = base === null && reward === null ? null : (base ?? 0) + (reward ?? 0);
  return {
    ...p,
    venue,
    variant: venueVariant(p.project),
    apyTotal,
    feeShare: apyTotal && apyTotal > 0 && base !== null ? base / apyTotal : null,
    mostlyIncentives: apyTotal !== null && apyTotal > 0 && (reward ?? 0) / apyTotal > 0.5,
    volumeToTvl: p.volumeUsd1d !== null && p.tvlUsd ? p.volumeUsd1d / p.tvlUsd : null,
    url: venue.website,
    chartUrl: `https://defillama.com/yields/pool/${p.id}`,
    stale: now - Date.parse(p.fetchedAt) > STALE_AFTER_MS,
  };
}

/** Sorted by fee APY, the honest headline here; ended pools last. */
export function sortLiquidity(rows: LiquidityRow[]): LiquidityRow[] {
  return [...rows].sort((a, b) => {
    if (a.status !== b.status) return a.status === "ended" ? 1 : -1;
    return (b.apyBase ?? -1) - (a.apyBase ?? -1);
  });
}

export function getLiquidityRows(): LiquidityRow[] {
  const now = Date.now();
  return sortLiquidity((loadLiquidityFile()?.pools ?? []).map((p) => toRow(p, now)));
}

export function liquidityRowsForTicker(ticker: string): LiquidityRow[] {
  const t = ticker.toUpperCase();
  return getLiquidityRows().filter((r) => r.underlyings.includes(t));
}

/**
 * The set the headline figures describe, and exactly what a visitor sees before
 * touching a filter: live stock/stablecoin pools of at least $10k.
 */
export function isDefaultVisible(r: LiquidityRow): boolean {
  return r.status === "live" && (r.tvlUsd ?? 0) >= DEFAULT_MIN_TVL && r.pairType === "stock-stable";
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/**
 * Headline numbers over the default view (see isDefaultVisible). The fee share
 * is weighted by pool size, so it answers
 * "of the dollars LPs earn, how much comes from traders" rather than letting
 * one thin pool with a 900% emission rate dominate an unweighted average.
 */
export function liquidityStats(rows: LiquidityRow[] = getLiquidityRows()) {
  const set = rows.filter(isDefaultVisible);
  const weighted = set.filter((r) => r.tvlUsd && r.apyTotal !== null && r.apyTotal > 0);
  const totalYield = weighted.reduce((s, r) => s + r.tvlUsd! * r.apyTotal!, 0);
  const feeYield = weighted.reduce((s, r) => s + r.tvlUsd! * (r.apyBase ?? 0), 0);
  const fees = set.map((r) => r.apyBase).filter((v): v is number => v !== null);
  const bestFee = set.reduce<LiquidityRow | null>(
    (best, r) => (r.apyBase !== null && (best === null || r.apyBase > (best.apyBase ?? -1)) ? r : best),
    null,
  );

  return {
    poolCount: set.length,
    allLiveCount: rows.filter((r) => r.status === "live").length,
    endedCount: rows.filter((r) => r.status === "ended").length,
    speculativeCount: rows.filter((r) => r.status === "live" && r.pairType === "stock-other").length,
    chains: [...new Set(set.map((r) => r.chain))].sort(),
    venues: [...new Set(set.map((r) => r.venue.name))].sort(),
    medianFeeApy: median(fees),
    feeShare: totalYield > 0 ? feeYield / totalYield : null,
    tvlUsd: set.reduce((s, r) => s + (r.tvlUsd ?? 0), 0),
    /** Summed over pools that report volume; some venues report none. */
    volumeUsd1d: set.reduce((s, r) => s + (r.volumeUsd1d ?? 0), 0),
    volumeReportingCount: set.filter((r) => r.volumeUsd1d !== null).length,
    bestFee,
    /** Best fee APY among pools deep enough that the rate means something. */
    bestFeeLiquid: set
      .filter((r) => (r.tvlUsd ?? 0) >= 250_000 && r.apyBase !== null)
      .sort((a, b) => b.apyBase! - a.apyBase!)[0] ?? null,
  };
}
