import { borrowTable, earnTable, liquidityTable } from "@/lib/api/pages-md";
import { liquidityItem, opportunityItem } from "@/lib/api/serialize";
import { getSummary } from "@/lib/api/summary";
import { mdLtv, mdPct, mdTable } from "@/lib/api/markdown";
import { getLiquidityRows } from "@/lib/data/liquidity";
import { getRows } from "@/lib/data/rows";
import { BRAND_NAME, SITE_DESCRIPTION, SITE_URL } from "@/config";

export const revalidate = 3600;

/**
 * Everything in one file: the key findings and every current table, in Markdown.
 * For an agent that wants the whole dataset in a single fetch without JSON.
 */
export function GET() {
  const s = getSummary();
  const rows = getRows().map(opportunityItem);
  const earn = rows.filter((r) => r.category === "earn").sort((a, b) => (b.apyTotal ?? -1) - (a.apyTotal ?? -1));
  const borrow = rows.filter((r) => r.borrow && r.status === "live").sort((a, b) => (b.borrow!.maxLtv ?? -1) - (a.borrow!.maxLtv ?? -1));
  const pools = getLiquidityRows().map(liquidityItem).sort((a, b) => (b.apyBase ?? -1) - (a.apyBase ?? -1));

  const body = `# ${BRAND_NAME} — full data (as of ${s.asOf})

> ${SITE_DESCRIPTION}

${s.answer}

## Key findings

${mdTable(
  ["Figure", "Value"],
  [
    ["Deposit venues", s.earn.venues],
    ["Best deposit APY", mdPct(s.earn.maxApy)],
    ["Median deposit APY", mdPct(s.earn.medianApy)],
    ["Deposit venues paying exactly 0%", s.earn.zeroCount],
    ["Share of deposit yield that is interest (not incentives)", s.earn.interestShare === null ? null : `${(s.earn.interestShare * 100).toFixed(1)}%`],
    ["Incentive programmes that have ended", s.earn.endedCount],
    ["Active liquidity pools", s.liquidity.activePools],
    ["Median LP fee APY, stock/stablecoin pools", mdPct(s.liquidity.medianFeeApy)],
    ["Borrow markets", s.borrow.markets],
    ["Max loan-to-value", mdLtv(s.borrow.maxLtv)],
    ["Median borrow APR", mdPct(s.borrow.medianBorrowApr)],
  ],
)}

## Earn: deposit a tokenized stock (${earn.length})

${earnTable(earn)}

## Liquidity: active pools (${pools.length}, all pair types)

All rates before impermanent loss. Fee APY is what reaches the LP.

${liquidityTable(pools)}

## Borrow: tokenized stock as collateral (${borrow.length})

${borrowTable(borrow)}

---
JSON API: ${SITE_URL}/developers · Licence: CC BY 4.0 — cite as ${BRAND_NAME}, ${SITE_URL}, retrieved ${s.asOf}. Information only, not financial advice.
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=3600, stale-while-revalidate=3600" },
  });
}
