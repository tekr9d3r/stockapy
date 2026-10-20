import { NextResponse } from "next/server";
import { getRows } from "@/lib/data/rows";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { BRAND_NAME, SITE_URL } from "@/config";

export const revalidate = 3600;

/**
 * The full dataset, free and CORS-open. Other sites citing this data is the
 * cheapest distribution we have. If this is ever metered, gate it here.
 */
export function GET() {
  const rows = getRows();

  return NextResponse.json(
    {
      source: BRAND_NAME,
      url: SITE_URL,
      license: "CC BY 4.0",
      disclaimer: "Information only, not financial advice. Verify on the platform.",
      fetchedAt: loadLatestSnapshot()?.fetchedAt ?? null,
      count: rows.length,
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
    },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=600, stale-while-revalidate=3600",
      },
    },
  );
}
