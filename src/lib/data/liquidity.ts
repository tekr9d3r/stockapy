import fs from "node:fs";
import path from "node:path";
import { REFRESH_INTERVAL_SECONDS } from "@/config";
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
  const apyTotal = p.apyBase === null ? null : p.apyBase + (p.apyReward ?? 0);
  return {
    ...p,
    venue: VENUES[p.venueId],
    apyTotal,
    mostlyIncentives: apyTotal !== null && apyTotal > 0 && (p.apyReward ?? 0) / apyTotal > 0.5,
    volumeToTvl: p.tvlUsd > 0 ? p.volumeUsd1d / p.tvlUsd : 0,
    stale: now - Date.parse(p.fetchedAt) > STALE_AFTER_MS,
  };
}

/** Fee APY first; pools whose fee share is unpublished sort by volume after them. */
export function sortLiquidity(rows: LiquidityRow[]): LiquidityRow[] {
  return [...rows].sort((a, b) => {
    if ((a.apyBase === null) !== (b.apyBase === null)) return a.apyBase === null ? 1 : -1;
    if (a.apyBase !== null && b.apyBase !== null) return b.apyBase - a.apyBase;
    return b.volumeUsd1d - a.volumeUsd1d;
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

/** What a visitor sees before touching a filter: stock/stablecoin pairs. */
export function isDefaultVisible(r: LiquidityRow): boolean {
  return r.pairType === "stock-stable";
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/**
 * Headline numbers over the default view. The fee figures cover only pools that
 * publish what reaches the LP (Raydium, Uniswap); Aero does not, so it is counted
 * in volume and TVL but never in a fee median.
 */
export function liquidityStats(rows: LiquidityRow[] = getLiquidityRows()) {
  const set = rows.filter(isDefaultVisible);
  const withFee = set.filter((r) => r.apyBase !== null);
  const deep = withFee.filter((r) => r.tvlUsd >= 250_000);
  return {
    poolCount: set.length,
    allCount: rows.length,
    speculativeCount: rows.filter((r) => r.pairType === "stock-other").length,
    chains: [...new Set(set.map((r) => r.chain))].sort(),
    venues: [...new Set(set.map((r) => r.venue.name))].sort(),
    feePoolCount: withFee.length,
    medianFeeApy: median(withFee.map((r) => r.apyBase!)),
    tvlUsd: set.reduce((s, r) => s + r.tvlUsd, 0),
    volumeUsd1d: set.reduce((s, r) => s + r.volumeUsd1d, 0),
    /** Best LP fee APY among pools deep enough for the rate to mean something. */
    bestFeeLiquid: [...deep].sort((a, b) => b.apyBase! - a.apyBase!)[0] ?? null,
    /** The single busiest pool by 24h volume. */
    busiest: [...set].sort((a, b) => b.volumeUsd1d - a.volumeUsd1d)[0] ?? null,
  };
}
