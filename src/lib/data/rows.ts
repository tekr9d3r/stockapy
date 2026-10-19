import { REFRESH_INTERVAL_SECONDS } from "@/config";
import { loadSeed } from "./seed";
import { snapshotsById } from "./snapshot";
import type { Row } from "./types";

const STALE_AFTER_MS = REFRESH_INTERVAL_SECONDS * 2 * 1000;

/**
 * Joins seed rows to their latest measurement. A seed entry with no snapshot and
 * no manual rate still renders — with "not collected yet" rather than a zero,
 * because a missing measurement and a measured 0% mean very different things.
 */
export function getRows(): Row[] {
  const seed = loadSeed();
  const snaps = snapshotsById();
  const now = Date.now();

  const rows = seed.opportunities
    .filter((opp) => opp.active)
    .map((opp): Row => {
      const token = seed.tokens.find((t) => t.symbol === opp.token)!;
      const underlying = seed.underlying_assets.find((a) => a.ticker === token.underlying)!;
      const issuer = seed.issuers.find((i) => i.id === token.issuer)!;
      const platform = seed.platforms.find((p) => p.id === opp.platform)!;

      const snap = snaps.get(opp.id);
      const manual = opp.manual;

      const apyTotal = snap ? snap.apyTotal : (manual?.apy_total ?? null);
      const apyBase = snap ? snap.apyBase : (manual?.apy_base ?? null);
      const apyReward = snap ? snap.apyReward : (manual?.apy_reward ?? null);
      const fetchedAt = snap ? snap.fetchedAt : (manual?.checked_at ?? null);

      return {
        id: opp.id,
        underlying,
        token,
        issuer,
        platform,
        chain: opp.chain,
        category: opp.category,
        variant: opp.variant,
        apyTotal,
        apyBase,
        apyReward,
        pointsLabel: snap?.pointsLabel ?? manual?.points_label ?? null,
        tvlUsd: snap ? snap.tvlUsd : (manual?.tvl_usd ?? null),
        lockup: opp.lockup,
        withdrawalDelayDays: opp.withdrawal_delay_days,
        url: opp.url,
        verified: opp.verified,
        eligibilityNote: opp.eligibility_note,
        riskNotes: opp.risk_notes,
        source: snap?.source ?? opp.data_source,
        fetchedAt,
        unmeasured: apyTotal === null,
        stale:
          fetchedAt !== null &&
          Number.isFinite(Date.parse(fetchedAt)) &&
          now - Date.parse(fetchedAt) > STALE_AFTER_MS,
      };
    });

  return sortRows(rows);
}

/** Highest APY first; unmeasured rows last, so the table never leads with a blank. */
export function sortRows(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    if (a.unmeasured !== b.unmeasured) return a.unmeasured ? 1 : -1;
    if (a.apyTotal !== b.apyTotal) return (b.apyTotal ?? 0) - (a.apyTotal ?? 0);
    return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
  });
}

export function rowsForTicker(ticker: string): Row[] {
  return getRows().filter(
    (r) => r.underlying.ticker.toLowerCase() === ticker.toLowerCase(),
  );
}

export function rowsForPlatform(platformId: string): Row[] {
  return getRows().filter((r) => r.platform.id === platformId);
}

export function rowsForIssuer(issuerId: string): Row[] {
  return getRows().filter((r) => r.issuer.id === issuerId);
}

/**
 * The site's headline numbers. Deliberately computed over `earn` rows only:
 * mixing in collateral venues, which pay 0% by design, would understate things.
 */
export function marketStats(rows: Row[] = getRows()) {
  const earn = rows.filter((r) => r.category === "earn" && !r.unmeasured);
  const apys = earn.map((r) => r.apyTotal ?? 0).sort((a, b) => a - b);
  const base = earn.map((r) => r.apyBase ?? 0);

  const median = apys.length
    ? apys.length % 2
      ? apys[(apys.length - 1) / 2]
      : (apys[apys.length / 2 - 1] + apys[apys.length / 2]) / 2
    : null;

  const totalApy = earn.reduce((sum, r) => sum + (r.apyTotal ?? 0), 0);
  const totalBase = base.reduce((sum, v) => sum + v, 0);

  return {
    opportunityCount: rows.length,
    earnCount: earn.length,
    medianApy: median,
    maxApy: apys.length ? apys[apys.length - 1] : null,
    /** Share of all yield on offer that is interest rather than incentives. */
    organicShare: totalApy > 0 ? totalBase / totalApy : null,
    zeroCount: earn.filter((r) => (r.apyTotal ?? 0) === 0).length,
    tvlUsd: rows.reduce((sum, r) => sum + (r.tvlUsd ?? 0), 0),
    best: earn.length ? earn.reduce((a, b) => ((b.apyTotal ?? 0) > (a.apyTotal ?? 0) ? b : a)) : null,
  };
}
