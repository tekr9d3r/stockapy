import { REFRESH_INTERVAL_SECONDS } from "@/config";
import { loadSeed } from "./seed";
import { snapshotsById } from "./snapshot";
import type { Platform, Row } from "./types";

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
        deepLink: opp.deep_link ?? opp.url,
        deepLinkIsSpecific: Boolean(opp.deep_link),
        chartUrl:
          opp.data_source === "defillama" && opp.external_id
            ? `https://defillama.com/yields/pool/${opp.external_id}`
            : null,
        verified: opp.verified,
        eligibilityNote: opp.eligibility_note,
        riskNotes: opp.risk_notes,
        source: snap?.source ?? opp.data_source,
        fetchedAt,
        status: opp.status ?? "live",
        endedOn: opp.ended_on ?? null,
        endedNote: opp.ended_note,
        unmeasured: apyTotal === null,
        borrow: opp.borrow
          ? {
              loanAsset: opp.borrow.loan_asset,
              // A hand-entered LTV is a fallback, never an override of live data.
              ltv: snap?.ltv ?? opp.borrow.manual_ltv ?? null,
              borrowApr: snap?.borrowApr ?? null,
              note: opp.borrow.note,
            }
          : null,
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
    const aEnded = a.status === "ended";
    const bEnded = b.status === "ended";
    if (aEnded !== bEnded) return aEnded ? 1 : -1;
    if (a.unmeasured !== b.unmeasured) return a.unmeasured ? 1 : -1;
    if (a.apyTotal !== b.apyTotal) return (b.apyTotal ?? 0) - (a.apyTotal ?? 0);
    return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
  });
}

/** Rows where the stock can be posted as collateral to borrow something else. */
export function borrowRows(rows: Row[] = getRows()): Row[] {
  return rows
    .filter((r) => r.borrow !== null && r.status === "live")
    .sort((a, b) => {
      const al = a.borrow?.ltv ?? -1;
      const bl = b.borrow?.ltv ?? -1;
      if (al !== bl) return bl - al;
      return (a.borrow?.borrowApr ?? Infinity) - (b.borrow?.borrowApr ?? Infinity);
    });
}

/** Headline numbers for the borrow side. */
export function borrowStats(rows: Row[] = borrowRows()) {
  const withLtv = rows.filter((r) => (r.borrow?.ltv ?? null) !== null);
  const withApr = rows.filter((r) => (r.borrow?.borrowApr ?? null) !== null);
  const aprs = withApr.map((r) => r.borrow!.borrowApr!).sort((a, b) => a - b);

  return {
    count: rows.length,
    maxLtv: withLtv.length ? Math.max(...withLtv.map((r) => r.borrow!.ltv!)) : null,
    cheapest: withApr.length
      ? withApr.reduce((a, b) => (b.borrow!.borrowApr! < a.borrow!.borrowApr! ? b : a))
      : null,
    medianApr: aprs.length
      ? aprs.length % 2
        ? aprs[(aprs.length - 1) / 2]
        : (aprs[aprs.length / 2 - 1] + aprs[aprs.length / 2]) / 2
      : null,
    loanAssets: [...new Set(rows.map((r) => r.borrow!.loanAsset))].sort(),
  };
}

export type PlatformGroup = {
  platform: Platform;
  rows: Row[];
  /** Highest APY on offer here. The range is what people should actually read. */
  topApy: number | null;
  lowApy: number | null;
  /** True when every measured row pays the same, so a range would be noise. */
  flatApy: boolean;
  /** Sum across the platform's markets. Null when nothing discloses a TVL. */
  tvlUsd: number | null;
  marketCount: number;
  /** Markets here whose programme has stopped. */
  endedCount: number;
  /** True when nothing on this platform is paying any more. */
  allEnded: boolean;
  chains: string[];
  stocks: string[];
  /** Best borrow terms available here, if any. */
  maxLtv: number | null;
  cheapestBorrowApr: number | null;
  /** True when no market here pays anything on the stock itself. */
  collateralOnly: boolean;
  unmeasuredCount: number;
};

/**
 * One entry per platform, with its markets rolled up. This is the top level of
 * the home page: 11 platforms is a list someone can actually read, where 53
 * individual markets is not.
 */
export function platformGroups(rows: Row[] = getRows()): PlatformGroup[] {
  const seed = loadSeed();

  const groups = seed.platforms
    .map((platform): PlatformGroup => {
      const own = rows.filter((r) => r.platform.id === platform.id);
      const liveOwn = own.filter((r) => r.status === "live");
      const measured = liveOwn.filter((r) => !r.unmeasured);
      const apys = measured.map((r) => r.apyTotal ?? 0);
      const withTvl = liveOwn.filter((r) => r.tvlUsd !== null);
      const borrowable = liveOwn.filter((r) => r.borrow?.ltv != null);
      const borrowApRs = liveOwn
        .map((r) => r.borrow?.borrowApr)
        .filter((v): v is number => v != null);

      const topApy = apys.length ? Math.max(...apys) : null;
      const lowApy = apys.length ? Math.min(...apys) : null;

      return {
        platform,
        rows: sortRows(own),
        topApy,
        lowApy,
        flatApy: topApy !== null && topApy === lowApy,
        tvlUsd: withTvl.length
          ? withTvl.reduce((sum, r) => sum + (r.tvlUsd ?? 0), 0)
          : null,
        marketCount: own.length,
        endedCount: own.length - liveOwn.length,
        allEnded: own.length > 0 && liveOwn.length === 0,
        chains: [...new Set(own.map((r) => r.chain))].sort(),
        stocks: [...new Set(own.map((r) => r.underlying.ticker))].sort(),
        maxLtv: borrowable.length
          ? Math.max(...borrowable.map((r) => r.borrow!.ltv!))
          : null,
        cheapestBorrowApr: borrowApRs.length ? Math.min(...borrowApRs) : null,
        collateralOnly: measured.length > 0 && apys.every((a) => a === 0),
        unmeasuredCount: liveOwn.filter((r) => r.unmeasured).length,
      };
    })
    .filter((g) => g.marketCount > 0);

  // Platforms that actually pay something first, then by size.
  return groups.sort((a, b) => {
    if (a.allEnded !== b.allEnded) return a.allEnded ? 1 : -1;
    if ((a.topApy ?? -1) !== (b.topApy ?? -1)) return (b.topApy ?? -1) - (a.topApy ?? -1);
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
  const live = rows.filter((r) => r.status === "live");
  const earn = live.filter((r) => r.category === "earn" && !r.unmeasured);
  const apys = earn.map((r) => r.apyTotal ?? 0).sort((a, b) => a - b);

  const median = apys.length
    ? apys.length % 2
      ? apys[(apys.length - 1) / 2]
      : (apys[apys.length / 2 - 1] + apys[apys.length / 2]) / 2
    : null;

  // Only rows where we actually know the split can answer "how much is interest".
  // A venue that pays 2% without saying where it comes from is not evidence of
  // incentives, so counting its base as 0 would overstate the point we are making.
  const split = earn.filter((r) => r.apyBase !== null && r.apyReward !== null);
  const totalApy = split.reduce((sum, r) => sum + (r.apyTotal ?? 0), 0);
  const totalBase = split.reduce((sum, r) => sum + (r.apyBase ?? 0), 0);

  return {
    opportunityCount: live.length,
    /** Programmes that have stopped paying. The thesis, measured. */
    endedCount: rows.length - live.length,
    earnCount: earn.length,
    medianApy: median,
    maxApy: apys.length ? apys[apys.length - 1] : null,
    /** Share of yield that is interest rather than incentives, over disclosed rows only. */
    organicShare: totalApy > 0 ? totalBase / totalApy : null,
    /** How many earn rows back the organicShare figure, and how many do not disclose. */
    splitKnownCount: split.length,
    splitUnknownCount: earn.length - split.length,
    zeroCount: earn.filter((r) => (r.apyTotal ?? 0) === 0).length,
    tvlUsd: live.reduce((sum, r) => sum + (r.tvlUsd ?? 0), 0),
    best: earn.length ? earn.reduce((a, b) => ((b.apyTotal ?? 0) > (a.apyTotal ?? 0) ? b : a)) : null,
  };
}
