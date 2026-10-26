import { mdLink, mdLtv, mdPct, mdTable, mdUsd } from "./markdown";
import { liquidityItem, opportunityItem, type LiquidityItem, type OpportunityItem } from "./serialize";
import { getSummary } from "./summary";
import { getPost } from "@/lib/content/posts";
import { getLiquidityRows, liquidityRowsForTicker, stockPageTickers } from "@/lib/data/liquidity";
import { assetByTicker } from "@/lib/data/assets";
import { getRows, rowsForTicker } from "@/lib/data/rows";
import { BRAND_NAME, SITE_URL } from "@/config";

/**
 * Markdown versions of the data pages, for agents: the same numbers as the HTML,
 * as plain tables with nothing to parse around them. Served at /earn.md etc.
 */

const footer = (htmlPath: string, jsonPath: string) =>
  `\n---\nSource: ${BRAND_NAME} (${SITE_URL}${htmlPath}) · JSON: ${SITE_URL}${jsonPath} · ` +
  `Licence: CC BY 4.0, cite with a link · Information only, not financial advice.\n`;

export function earnTable(items: OpportunityItem[]): string {
  return mdTable(
    ["Stock", "Token", "Platform", "Chain", "APY", "Interest", "Incentives", "TVL", "Status", "Link"],
    items.map((i) => [
      i.underlyingTicker,
      i.tokenSymbol,
      i.platform,
      i.chain,
      i.unmeasured ? "not collected" : mdPct(i.apyTotal),
      mdPct(i.apyBase),
      mdPct(i.apyReward),
      mdUsd(i.tvlUsd),
      i.status,
      mdLink("open", i.url),
    ]),
  );
}

export function liquidityTable(items: LiquidityItem[]): string {
  return mdTable(
    ["Stock", "Pair", "Venue", "Chain", "Fee APY", "TVL", "24h volume", "Note", "Link"],
    items.map((i) => [
      i.underlyingTickers.join(", "),
      i.pair.join(" / "),
      i.venue,
      i.chain,
      mdPct(i.apyBase),
      mdUsd(i.tvlUsd),
      mdUsd(i.volumeUsd1d),
      [i.volumeWindowHours != null ? `${i.volumeWindowHours}h of data` : null, i.pairType === "stock-other" ? "speculative pair" : null]
        .filter(Boolean)
        .join("; ") || null,
      mdLink("deposit", i.url),
    ]),
  );
}

export function borrowTable(items: OpportunityItem[]): string {
  return mdTable(
    ["Stock", "Token", "Platform", "Chain", "Max LTV", "Borrow", "Borrow APR", "Link"],
    items.map((i) => [
      i.underlyingTicker,
      i.tokenSymbol,
      i.platform,
      i.chain,
      mdLtv(i.borrow!.maxLtv),
      i.borrow!.loanAsset,
      mdPct(i.borrow!.borrowApr),
      mdLink("borrow", i.url),
    ]),
  );
}

const earnItems = () =>
  getRows()
    .map(opportunityItem)
    .filter((i) => i.category === "earn")
    .sort((a, b) => (b.apyTotal ?? -1) - (a.apyTotal ?? -1));
const borrowItems = () =>
  getRows()
    .map(opportunityItem)
    .filter((i) => i.borrow && i.status === "live")
    .sort((a, b) => (b.borrow!.maxLtv ?? -1) - (a.borrow!.maxLtv ?? -1));
const poolItems = () =>
  getLiquidityRows()
    .map(liquidityItem)
    .filter((i) => i.pairType === "stock-stable")
    .sort((a, b) => (b.apyBase ?? -1) - (a.apyBase ?? -1));

export function homeMd(): string {
  const s = getSummary();
  return `# ${BRAND_NAME}: yield on tokenized stocks

${s.answer}

## Headline numbers (as of ${s.asOf})

${mdTable(
  ["Category", "Figure", "Value"],
  [
    ["Earn", "Best deposit APY", mdPct(s.earn.maxApy)],
    ["Earn", "Median deposit APY", mdPct(s.earn.medianApy)],
    ["Earn", "Share of deposit yield that is interest", s.earn.interestShare === null ? null : `${(s.earn.interestShare * 100).toFixed(1)}%`],
    ["Liquidity", "Median LP fee APY (stablecoin pairs)", mdPct(s.liquidity.medianFeeApy)],
    ["Liquidity", "Active pools", s.liquidity.activePools],
    ["Borrow", "Max loan-to-value", mdLtv(s.borrow.maxLtv)],
    ["Borrow", "Median borrow APR", mdPct(s.borrow.medianBorrowApr)],
  ],
)}

## By stock

${mdTable(
  ["Stock", "Best deposit APY", "Best LP fee APY ($250k+ pools)", "Max LTV", "Page"],
  s.stocks.map((x) => [x.ticker, mdPct(x.bestEarnApy), mdPct(x.bestLpFeeApy), mdLtv(x.maxLtv), `${SITE_URL}/stock/${x.ticker.toLowerCase()}.md`]),
)}

## More

- Earn: ${SITE_URL}/earn.md
- Liquidity: ${SITE_URL}/liquidity.md
- Borrow: ${SITE_URL}/borrow.md
- API: ${SITE_URL}/developers
${footer("/", "/api/v1/summary")}`;
}

export function earnMd(): string {
  const s = getSummary();
  return `# Lend your tokenized stock and earn a yield (Earn)

As of ${s.asOf}: up to ${mdPct(s.earn.maxApy)} across ${s.earn.venues} venues; median ${mdPct(s.earn.medianApy)}. Interest and incentives are shown separately; ended programmes keep their last rate.

${earnTable(earnItems())}
${footer("/earn", "/api/v1/earn")}`;
}

export function liquidityMd(): string {
  const s = getSummary();
  return `# Act as a market maker with your tokenized stock (Liquidity)

As of ${s.asOf}: median LP fee APY ${mdPct(s.liquidity.medianFeeApy)} across stock/stablecoin pools, before impermanent loss. Fee APY is what reaches the LP.

${liquidityTable(poolItems())}
${footer("/liquidity", "/api/v1/liquidity")}`;
}

export function borrowMd(): string {
  const s = getSummary();
  return `# Borrow cash against your tokenized stock (Borrow)

As of ${s.asOf}: ${s.borrow.markets} markets, up to ${mdLtv(s.borrow.maxLtv)} loan-to-value, median borrow APR ${mdPct(s.borrow.medianBorrowApr)}. Max LTV is the liquidation line, not a target.

${borrowTable(borrowItems())}
${footer("/borrow", "/api/v1/borrow")}`;
}

export function stockMd(ticker: string): string | null {
  const asset = assetByTicker(ticker);
  if (!asset || !stockPageTickers().has(asset.ticker)) return null;
  const rows = rowsForTicker(asset.ticker).map(opportunityItem);
  const earn = rows.filter((r) => r.category === "earn").sort((a, b) => (b.apyTotal ?? -1) - (a.apyTotal ?? -1));
  const borrow = rows.filter((r) => r.borrow && r.status === "live");
  const pools = liquidityRowsForTicker(asset.ticker).map(liquidityItem).filter((p) => p.pairType !== "stock-other");
  const t = asset.ticker.toLowerCase();
  return `# Tokenized ${asset.ticker} (${asset.name})

## Lend (${earn.length})

${earn.length ? earnTable(earn) : "None tracked."}

## Act as a market maker (${pools.length})

${pools.length ? liquidityTable(pools) : "No active pools."}

## Borrow against it (${borrow.length})

${borrow.length ? borrowTable(borrow) : "No borrow markets."}
${footer(`/stock/${t}`, `/api/v1/stocks/${t}`)}`;
}

export function hubMd(slug: string): string | null {
  const post = getPost(slug);
  if (!post) return null;
  // MDX components (live tables) have no Markdown form; agents get the data from the API.
  const body = post.body.replace(/<[A-Z][A-Za-z]*[^>]*\/>/g, "").trim();
  return `# ${post.title}

${post.description}

Published ${post.datePublished}${post.dateModified !== post.datePublished ? `, updated ${post.dateModified}` : ""}.

${body}
\n---\nSource: ${BRAND_NAME} (${SITE_URL}/hub/${slug}) · Licence: CC BY 4.0\n`;
}

/** Map a page path to its Markdown, or null when there is none. */
export function markdownFor(path: string[]): string | null {
  const [first, second] = path;
  if (path.length === 0 || first === "index") return homeMd();
  if (path.length === 1 && first === "earn") return earnMd();
  if (path.length === 1 && first === "liquidity") return liquidityMd();
  if (path.length === 1 && first === "borrow") return borrowMd();
  if (path.length === 2 && first === "stock") return stockMd(second);
  if (path.length === 2 && first === "hub") return hubMd(second);
  return null;
}
