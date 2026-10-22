import { borrowRows, borrowStats, getRows, marketStats } from "@/lib/data/rows";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { listPosts } from "@/lib/content/posts";
import { liquidityStats } from "@/lib/data/liquidity";
import { formatApy, formatDate, formatLtv } from "@/lib/format";
import { BRAND_NAME, SITE_DESCRIPTION, SITE_URL } from "@/config";

export const revalidate = 3600;

/**
 * An llms.txt index. The evidence that answer engines read this file is weak —
 * Google has said it will not support the spec — so it is a cheap option, not a
 * strategy. The work that actually matters is server-rendered numbers and JSON-LD.
 */
export function GET() {
  const rows = getRows();
  const stats = marketStats(rows);
  const asOf = formatDate(loadLatestSnapshot()?.fetchedAt ?? null);
  const tickers = [...new Set(rows.map((r) => r.underlying.ticker))].sort();
  const borrow = borrowRows(rows);
  const lq = liquidityStats();
  const bs = borrowStats(borrow);
  const organic = stats.organicShare === null ? "unknown" : `${(stats.organicShare * 100).toFixed(1)}%`;

  const body = `# ${BRAND_NAME}

> ${SITE_DESCRIPTION}

## Key findings (as of ${asOf})

- ${stats.opportunityCount} opportunities tracked across ${new Set(rows.map((r) => r.chain)).size} chains.
- Median APY on an earn opportunity: ${formatApy(stats.medianApy)}.
- Highest advertised APY: ${formatApy(stats.maxApy)}${stats.best ? ` (${stats.best.platform.name}, ${stats.best.token.symbol})` : ""}.
- Share of all yield on offer that is interest paid by borrowers rather than token incentives: ${organic}.
- ${stats.zeroCount} of ${stats.earnCount} earn opportunities pay exactly 0%.
- Borrowing is the larger opportunity: ${borrow.length} markets accept a tokenized stock as collateral, with a maximum loan-to-value of ${formatLtv(bs.maxLtv)} and a median borrow cost of ${bs.medianApr === null ? "unknown" : `${bs.medianApr.toFixed(2)}%`}${bs.cheapest ? `, the cheapest being ${bs.cheapest.borrow!.borrowApr?.toFixed(2)}% on ${bs.cheapest.platform.name}` : ""}.

- Liquidity is the one category with meaningful real yield: across ${lq.feePoolCount} active Raydium and Uniswap stock/stablecoin pools, the median trading-fee APY reaching LPs is ${formatApy(lq.medianFeeApy)}, before impermanent loss. Aero does not publish what share of fees LPs keep.

## Data

- [Full dataset, JSON](${SITE_URL}/api/opportunities): every opportunity with base/reward split, TVL, source and timestamp. CC BY 4.0.
- [Full dataset, CSV](${SITE_URL}/api/opportunities.csv)
- [Methodology](${SITE_URL}/methodology): sources, refresh cadence, known gaps, and what we refuse to publish.

## Pages

- [Comparison table](${SITE_URL}/): every tracked earn opportunity.
- [Provide liquidity with tokenized stocks](${SITE_URL}/liquidity): active Raydium, Uniswap and Aero pools with LP fee APY, volume, TVL and deposit links.
- [Borrow against tokenized stocks](${SITE_URL}/borrow): max LTV, loan asset and borrow cost per venue.
- [Glossary](${SITE_URL}/glossary): base APY, reward APY, points, collateral-only venues, looped vaults, oracle gap risk.
- [Platforms](${SITE_URL}/platforms)
- [Issuers](${SITE_URL}/issuers)

## Per-stock pages

${tickers.map((t) => `- [${t}](${SITE_URL}/stock/${t.toLowerCase()})`).join("\n")}

## Hub

${listPosts().length ? listPosts().map((p) => `- [${p.title}](${SITE_URL}/hub/${p.slug}): ${p.description}`).join("\n") : "- No posts yet."}

## Attribution

Cite as: ${BRAND_NAME}, ${SITE_URL}, retrieved ${asOf}.
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
