import { getRows } from "@/lib/data/rows";

export const revalidate = 3600;

const COLUMNS = [
  "id",
  "underlying_ticker",
  "token_symbol",
  "issuer",
  "platform",
  "platform_kind",
  "chain",
  "category",
  "apy_total",
  "apy_base",
  "apy_reward",
  "tvl_usd",
  "lockup",
  "url",
  "source",
  "fetched_at",
] as const;

function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function GET() {
  const lines = [COLUMNS.join(",")];

  for (const row of getRows()) {
    lines.push(
      [
        row.id,
        row.underlying.ticker,
        row.token.symbol,
        row.issuer.name,
        row.platform.name,
        row.platform.kind,
        row.chain,
        row.category,
        row.apyTotal,
        row.apyBase,
        row.apyReward,
        row.tvlUsd,
        row.lockup,
        row.url,
        row.source,
        row.fetchedAt,
      ]
        .map(escape)
        .join(","),
    );
  }

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "access-control-allow-origin": "*",
      "content-disposition": 'inline; filename="stockapy-opportunities.csv"',
    },
  });
}
