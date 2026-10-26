import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { BorrowTable } from "@/components/BorrowTable";
import { LiquidityTable } from "@/components/LiquidityTable";
import { OpportunityTable } from "@/components/OpportunityTable";
import { StockLogo } from "@/components/StockLogo";
import { Tile } from "@/components/CategoryHeader";
import { Faq } from "@/components/Faq";
import { InfoTip } from "@/components/InfoTip";
import { LearnMore } from "@/components/LearnMore";
import { IssuerLogo } from "@/components/Logo";
import { assetByTicker, tokensForTicker } from "@/lib/data/assets";
import { borrowRows, borrowStats, marketStats, rowsForTicker } from "@/lib/data/rows";
import { loadSeed } from "@/lib/data/seed";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { liquidityRowsForTicker, stockPageTickers, type LiquidityRow } from "@/lib/data/liquidity";
import { formatApy, formatDate, formatLtv, formatPp, formatUsd } from "@/lib/format";
import { breadcrumbLd, datasetLd, faqLd, itemListLd, stockFaq } from "@/lib/seo/jsonld";
import { BRAND_NAME } from "@/config";

export const revalidate = 3600;
export const dynamicParams = false;

/**
 * A page per stock with a real market: a deposit or borrow venue, or an active
 * liquidity pool (stockPageTickers). Stocks with neither get no page.
 */
export function generateStaticParams() {
  return [...stockPageTickers()].map((t) => ({ ticker: t.toLowerCase() }));
}

/** Pools that can headline: stablecoin pairs with a full day of data and real depth. */
const DEEP_POOL_USD = 250_000;

function load(ticker: string) {
  const asset = assetByTicker(ticker);
  if (!asset || !stockPageTickers().has(asset.ticker)) return null;
  const rows = rowsForTicker(asset.ticker);
  // Hide speculative pairs on the stock page; the Liquidity page has them.
  const allPools = liquidityRowsForTicker(asset.ticker);
  const pools = allPools.filter((r) => r.pairType !== "stock-other");
  const ranked = pools
    .filter((r) => r.pairType === "stock-stable" && r.apyBase !== null && r.volumeWindowHours == null)
    .sort((a, b) => b.apyBase! - a.apyBase!);
  const bestPool: LiquidityRow | null = ranked.find((r) => r.tvlUsd >= DEEP_POOL_USD) ?? ranked[0] ?? null;
  return { asset, rows, stats: marketStats(rows), allPools, pools, bestPool };
}

const pairName = (r: LiquidityRow) => r.legs.map((l) => l.symbol).join(" / ");

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const data = load(ticker);
  if (!data) return {};

  const { asset, stats, bestPool, pools } = data;
  const best = stats.best;
  const title = `Earn yield on tokenized ${asset.ticker} (${asset.name})`;
  const description = best
    ? `The highest rate on tokenized ${asset.ticker} is ${formatApy(stats.maxApy)} on ` +
      `${best.platform.name}, of which ${formatPp(best.apyReward)}pp is token incentives. ` +
      `${data.rows.length + pools.length} markets compared, updated hourly.`
    : bestPool
      ? `Tokenized ${asset.ticker}: providing liquidity pays up to ${formatApy(bestPool.apyBase)} in trading fees ` +
        `on ${bestPool.venue.name}. ${pools.length} active pools compared, updated hourly.`
      : `Every market for tokenized ${asset.ticker}, compared. Updated hourly.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/stock/${asset.ticker.toLowerCase()}`,
      types: {
        "text/markdown": `/stock/${asset.ticker.toLowerCase()}.md`,
        "application/json": `/api/v1/stocks/${asset.ticker.toLowerCase()}`,
      },
    },
    openGraph: { title: `${title} · ${BRAND_NAME}`, description, type: "website" },
  };
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const data = load(ticker);
  if (!data) notFound();

  const { asset, rows, stats, allPools, pools, bestPool } = data;
  const asOf = formatDate(loadLatestSnapshot()?.fetchedAt ?? null);
  const best = stats.best;
  const borrow = borrowRows(rows);
  const borrowSummary = borrowStats(borrow);
  const hiddenPools = allPools.length - pools.length;
  const organicPct = stats.organicShare === null ? null : stats.organicShare * 100;

  // Every verified token for this asset, grouped by issuer, from the registry.
  const issuers = new Map(loadSeed().issuers.map((i) => [i.id, i]));
  const tokens = tokensForTicker(asset.ticker);
  const byIssuer = new Map<string, typeof tokens>();
  for (const t of tokens) byIssuer.set(t.issuer, [...(byIssuer.get(t.issuer) ?? []), t]);
  const issuerName = (id: string) => (issuers.get(id)?.name ?? id).replace(/ \(.*\)$/, "");

  const faq = stockFaq(asset, rows, {
    tokens: tokens.map((t) => ({ symbol: t.symbol, issuer: issuerName(t.issuer), chain: t.chain })),
    bestPool: bestPool
      ? { pair: pairName(bestPool), venue: bestPool.venue.name, chain: bestPool.chain, feeApy: bestPool.apyBase!, tvlUsd: bestPool.tvlUsd }
      : null,
  });

  return (
    <>
      <JsonLd
        data={[
          datasetLd({
            name: `Yield on tokenized ${asset.ticker} (${asset.name})`,
            description:
              `Every market for a tokenized ${asset.ticker}: deposit venues, liquidity pools and borrow ` +
              `markets, with base interest and token incentives shown separately.`,
            url: `/stock/${asset.ticker.toLowerCase()}`,
            modified: loadLatestSnapshot()?.fetchedAt ?? null,
            variables: ["APY", "Base APY", "Reward APY", "LP fee APY", "TVL in USD", "Max LTV", "Chain"],
          }),
          ...(rows.length ? [itemListLd(rows, `Ways to earn on tokenized ${asset.ticker}`)] : []),
          faqLd(faq),
          breadcrumbLd([
            { name: BRAND_NAME, path: "/" },
            { name: "Stocks", path: "/stocks" },
            { name: asset.ticker, path: `/stock/${asset.ticker.toLowerCase()}` },
          ]),
        ]}
      />

      <nav className="mb-4 text-xs text-fg-subtle">
        <Link href="/stocks" className="hover:text-fg">
          Stocks
        </Link>
        <span className="mx-1.5">/</span>
        <span>{asset.ticker}</span>
      </nav>

      <div className="flex items-center gap-3">
        <StockLogo ticker={asset.ticker} name={asset.name} size={44} />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Earn on tokenized {asset.ticker}</h1>
          <p className="text-sm text-fg-subtle">
            {asset.name} · {asset.type === "etf" ? "ETF" : "Stock"}
          </p>
        </div>
      </div>

      {/* Answer-first: dated, specific, with the incentive split spelled out. */}
      <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-fg-muted">
        {best ? (
          <>
            As of {asOf}: up to <strong className="text-fg">{formatApy(stats.maxApy)}</strong> on{" "}
            {best.platform.name} ({best.token.symbol}, {formatPp(best.apyBase)}pp interest +{" "}
            {formatPp(best.apyReward)}pp incentives); the median of {stats.earnCount} venues is{" "}
            {formatApy(stats.medianApy)}.
          </>
        ) : bestPool ? (
          <>
            As of {asOf}: no deposit market pays on tokenized {asset.ticker} yet. Providing liquidity pays up to{" "}
            <strong className="text-fg">{formatApy(bestPool.apyBase)}</strong> in trading fees ({pairName(bestPool)} on{" "}
            {bestPool.venue.name}, {formatUsd(bestPool.tvlUsd)} TVL), before impermanent loss.
          </>
        ) : (
          <>
            As of {asOf}, tokenized {asset.ticker} trades in {pools.length} active{" "}
            {pools.length === 1 ? "pool" : "pools"}; no deposit market pays on it yet.
          </>
        )}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          category="earn"
          label="Best deposit rate"
          value={best ? formatApy(stats.maxApy) : "—"}
          note={best ? best.platform.name : "no deposit market yet"}
        />
        <Tile
          category="liquidity"
          label="Best LP fee APY"
          value={bestPool ? formatApy(bestPool.apyBase) : "—"}
          note={bestPool ? `${bestPool.venue.name} · ${formatUsd(bestPool.tvlUsd)} TVL` : "no stablecoin pool with a full day of data"}
        />
        <Tile
          category="borrow"
          label="Max LTV"
          value={formatLtv(borrowSummary.maxLtv)}
          note={
            borrowSummary.cheapest
              ? `from ${borrowSummary.cheapest.borrow!.borrowApr?.toFixed(2)}%`
              : borrow.length
                ? undefined
                : "no borrow market yet"
          }
        />
        <Tile
          label="Active markets"
          value={String(rows.filter((r) => r.status === "live").length + pools.length)}
          note={organicPct === null ? `${tokens.length} verified ${tokens.length === 1 ? "token" : "tokens"}` : `${organicPct.toFixed(1)}% of deposit yield is interest`}
        />
      </dl>

      {rows.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            Lend {asset.ticker}
          </h2>
          <OpportunityTable rows={rows} />
        </section>
      )}

      {pools.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            Act as a market maker
            <InfoTip
              text={`Fee APY is paid by traders, before impermanent loss; concentrated pools only earn while in range.${hiddenPools > 0 ? ` ${hiddenPools} speculative pairs are hidden here.` : ""}`}
            />
          </h2>
          <LiquidityTable rows={pools} />
        </section>
      )}

      {borrow.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            Borrow against it
            <InfoTip text="Max LTV is the liquidation line, not a target: borrowing near it invites liquidation on an ordinary day's move." />
          </h2>
          <BorrowTable rows={borrow} compact />
        </section>
      )}

      {byIssuer.size > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            Which {asset.ticker} token?
            <InfoTip text="The same share exists as several tokens. They are not interchangeable: each issuer has its own chain, redemption rules and venues." />
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...byIssuer].map(([issuerId, list]) => {
              const bestHere = rows
                .filter((r) => r.issuer.id === issuerId && r.status === "live")
                .reduce<number | null>((m, r) => (r.apyTotal !== null && (m === null || r.apyTotal > m) ? r.apyTotal : m), null);
              return (
                <div key={issuerId} className="flex items-center gap-3 rounded-xl border bg-bg-raised p-4" title={issuers.get(issuerId)?.structure_note}>
                  <IssuerLogo id={issuerId} name={issuerName(issuerId)} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{issuerName(issuerId)}</p>
                    <p className="truncate text-xs text-fg-subtle">
                      {[...new Set(list.map((t) => t.symbol.replace(/ \(Robinhood\)$/, "")))].join(", ")} ·{" "}
                      {[...new Set(list.map((t) => t.chain))].join(", ")}
                    </p>
                  </div>
                  {bestHere !== null && <span className="text-sm font-semibold tabular-nums">{formatApy(bestHere)}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <LearnMore
        posts={["earning-on-tokenized-stocks-what-to-know", "providing-liquidity-with-tokenized-stocks", "borrowing-against-tokenized-stocks-risks"]}
      />

      <Faq entries={faq} title={`Questions about tokenized ${asset.ticker}`} />

      {rows.some((r) => r.riskNotes) && (
        <details className="mt-4 max-w-3xl border-y py-3.5">
          <summary className="cursor-pointer text-sm font-medium text-fg-muted">Platform-specific notes</summary>
          <ul className="mt-3 space-y-2">
            {[...new Map(rows.filter((r) => r.riskNotes).map((r) => [r.platform.id, r])).values()].map((row) => (
              <li key={row.platform.id} className="text-sm leading-relaxed">
                <span className="font-medium">{row.platform.name}: </span>
                <span className="text-fg-muted">{row.riskNotes}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
