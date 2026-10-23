import type { LiquidityRow } from "@/lib/data/liquidity";
import type { Row } from "@/lib/data/types";

/**
 * The one public shape of every record, shared by /api/opportunities, the v1 API,
 * the CSV, the Markdown mirrors and llms-full.txt, so field names never drift.
 */
export function opportunityItem(row: Row) {
  return {
    id: row.id,
    underlyingTicker: row.underlying.ticker,
    underlyingName: row.underlying.name,
    tokenSymbol: row.token.symbol,
    issuer: row.issuer.name,
    platform: row.platform.name,
    platformKind: row.platform.kind,
    chain: row.chain,
    category: row.category,
    listed: row.listed,
    status: row.status,
    endedOn: row.endedOn,
    endedNote: row.endedNote ?? null,
    variant: row.variant ?? null,
    apyTotal: row.apyTotal,
    apyBase: row.apyBase,
    apyReward: row.apyReward,
    pointsLabel: row.pointsLabel,
    tvlUsd: row.tvlUsd,
    lockup: row.lockup,
    withdrawalDelayDays: row.withdrawalDelayDays ?? null,
    borrow: row.borrow
      ? {
          loanAsset: row.borrow.loanAsset,
          maxLtv: row.borrow.ltv,
          borrowApr: row.borrow.borrowApr,
          /** Yield on the LOAN asset supplied here, not on the stock. */
          lendApy: row.borrow.lendApy,
        }
      : null,
    url: row.deepLink,
    platformUrl: row.url,
    deepLinkIsMarketSpecific: row.deepLinkIsSpecific,
    chartUrl: row.chartUrl,
    verified: row.verified,
    source: row.source,
    fetchedAt: row.fetchedAt,
    unmeasured: row.unmeasured,
    stale: row.stale,
  };
}

export function liquidityItem(r: LiquidityRow) {
  return {
    id: r.id,
    category: "liquidity" as const,
    venue: r.venue.name,
    venueVariant: r.variant,
    chain: r.chain,
    poolAddress: r.address,
    underlyingTickers: r.underlyings,
    issuers: r.issuers,
    pair: r.legs.map((l) => l.symbol),
    pairType: r.pairType,
    poolType: r.poolType,
    feeTier: r.feeTier,
    /** Fee APY that reaches the LP. Null where it cannot be worked out. */
    apyBase: r.apyBase,
    /** Fees the pool generates per year as a share of TVL, before anyone's cut. */
    apyBaseGross: r.apyBaseGross,
    lpFeeShare: r.lpFeeShare,
    apyReward: r.apyReward,
    apyTotal: r.apyTotal,
    apyBase7d: r.apyBase7d,
    tvlUsd: r.tvlUsd,
    volumeUsd1d: r.volumeUsd1d,
    volumeUsd7d: r.volumeUsd7d,
    /** Hours behind volumeUsd1d and apyBase when under 24 (not enough on-chain history yet). */
    volumeWindowHours: r.volumeWindowHours ?? null,
    /** Aero gauge emissions, paid to stakers instead of fees. Not included in apyTotal. */
    emissions: r.emissions ?? null,
    feeNote: r.feeNote,
    url: r.url,
    chartUrl: r.chartUrl,
    source: r.source,
    fetchedAt: r.fetchedAt,
    note: "Rates are before impermanent loss.",
  };
}

export type OpportunityItem = ReturnType<typeof opportunityItem>;
export type LiquidityItem = ReturnType<typeof liquidityItem>;
