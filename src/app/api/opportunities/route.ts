import { NextResponse } from "next/server";
import { getRows } from "@/lib/data/rows";
import { getLiquidityRows } from "@/lib/data/liquidity";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { liquidityItem, opportunityItem } from "@/lib/api/serialize";
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
      opportunities: rows.map(opportunityItem),
      liquidity: liquidity.map(liquidityItem),
    },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=600, stale-while-revalidate=3600",
      },
    },
  );
}
