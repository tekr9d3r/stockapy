import { NextResponse } from "next/server";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { BRAND_NAME, SITE_URL } from "@/config";

const HEADERS = {
  "access-control-allow-origin": "*",
  // Data changes hourly; let CDNs and agents cache per URL.
  "cache-control": "public, s-maxage=3600, stale-while-revalidate=3600",
};

/** Every v1 response carries where it came from, when, and under what licence. */
export function apiJson(body: Record<string, unknown>) {
  return NextResponse.json(
    {
      source: BRAND_NAME,
      url: SITE_URL,
      docs: `${SITE_URL}/developers`,
      license: "CC BY 4.0 — cite StockAPY with a link",
      disclaimer: "Information only, not financial advice. Verify on the platform.",
      fetchedAt: loadLatestSnapshot()?.fetchedAt ?? null,
      ...body,
    },
    { headers: HEADERS },
  );
}

export function apiError(status: number, error: string) {
  return NextResponse.json({ error, docs: `${SITE_URL}/developers` }, { status, headers: HEADERS });
}
