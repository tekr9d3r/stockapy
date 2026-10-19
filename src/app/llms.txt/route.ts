import { getRows, marketStats } from "@/lib/data/rows";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { listPosts } from "@/lib/content/posts";
import { formatApy, formatDate } from "@/lib/format";
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
  const organic = stats.organicShare === null ? "unknown" : `${(stats.organicShare * 100).toFixed(1)}%`;

  const body = `# ${BRAND_NAME}

> ${SITE_DESCRIPTION}

## Key findings (as of ${asOf})

- ${stats.opportunityCount} opportunities tracked across ${new Set(rows.map((r) => r.chain)).size} chains.
- Median APY on an earn opportunity: ${formatApy(stats.medianApy)}.
- Highest advertised APY: ${formatApy(stats.maxApy)}${stats.best ? ` (${stats.best.platform.name}, ${stats.best.token.symbol})` : ""}.
- Share of all yield on offer that is interest paid by borrowers rather than token incentives: ${organic}.
- ${stats.zeroCount} of ${stats.earnCount} earn opportunities pay exactly 0%.

## Data

- [Full dataset, JSON](${SITE_URL}/api/opportunities): every opportunity with base/reward split, TVL, source and timestamp. CC BY 4.0.
- [Full dataset, CSV](${SITE_URL}/api/opportunities.csv)
- [Methodology](${SITE_URL}/methodology): sources, refresh cadence, known gaps, and what we refuse to publish.

## Pages

- [Comparison table](${SITE_URL}/): every tracked opportunity.
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
