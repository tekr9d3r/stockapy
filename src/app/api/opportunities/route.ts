import { NextResponse } from "next/server";
import { getRows } from "@/lib/data/rows";
import { getLiquidityRows } from "@/lib/data/liquidity";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { BRAND_NAME, SITE_URL } from "@/config";

export const revalidate = 3600;

/**
 * The full dataset, free and CORS-open. Other sites citing this data is the
 * cheapest distribution we have. If this is ever metered, gate it here.
 */
export function GET() {
  const rows = getRows();
  const liquidity = getLiquidityRows();

  return NextResponse.json(
    {
      source: BRAND_NAME,
      url: SITE_URL,
      license: "CC BY 4.0",
      disclaimer: "Information only, not financial advice. Verify on the platform.",
      fetchedAt: loadLatestSnapshot()?.fetchedAt ?? null,
      count: rows.length + liquidity.length,
      opportunities: rows.map((row) => ({
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
      })),
      liquidity: liquidity.map((r) => ({
        id: r.id,
        category: "liquidity",
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
      })),
    },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=600, stale-while-revalidate=3600",
      },
    },
  );
}
