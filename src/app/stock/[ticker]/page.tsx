import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { BorrowTable } from "@/components/BorrowTable";
import { LiquidityTable } from "@/components/LiquidityTable";
import { OpportunityTable } from "@/components/OpportunityTable";
import { StockLogo } from "@/components/StockLogo";
import { Tile } from "@/components/CategoryHeader";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Faq } from "@/components/Faq";
import { InfoTip } from "@/components/InfoTip";
import { LearnMore } from "@/components/LearnMore";
import { IssuerLogo } from "@/components/Logo";
import { borrowRows, borrowStats, getRows, marketStats, rowsForTicker } from "@/lib/data/rows";
import { loadSeed } from "@/lib/data/seed";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { liquidityRowsForTicker } from "@/lib/data/liquidity";
import { formatApy, formatDate, formatLtv, formatPp, formatUsd } from "@/lib/format";
import { breadcrumbLd, datasetLd, faqLd, itemListLd, stockFaq } from "@/lib/seo/jsonld";
import { BRAND_NAME } from "@/config";

export const revalidate = 3600;
export const dynamicParams = false;

/** Only tickers that actually have an opportunity get a page. No thin permutations. */
export function generateStaticParams() {
  const tickers = new Set(getRows().map((r) => r.underlying.ticker.toLowerCase()));
  return [...tickers].map((ticker) => ({ ticker }));
}

function load(ticker: string) {
  const asset = loadSeed().underlying_assets.find(
    (a) => a.ticker.toLowerCase() === ticker.toLowerCase(),
  );
  const rows = rowsForTicker(ticker);
  if (!asset || rows.length === 0) return null;
  return { asset, rows, stats: marketStats(rows) };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const data = load(ticker);
  if (!data) return {};

  const { asset, stats } = data;
  const best = stats.best;
  const title = `Earn yield on tokenized ${asset.ticker} (${asset.name})`;
  const description = best
    ? `The highest rate on tokenized ${asset.ticker} is ${formatApy(stats.maxApy)} on ` +
      `${best.platform.name}, of which ${formatPp(best.apyReward)}pp is token incentives. ` +
      `${data.rows.length} venues compared, updated hourly.`
    : `Every venue that accepts tokenized ${asset.ticker}, compared. Updated hourly.`;

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

  const { asset, rows, stats } = data;
  const asOf = formatDate(loadLatestSnapshot()?.fetchedAt ?? null);
  const best = stats.best;
  const byIssuer = Object.groupBy(rows, (r) => r.issuer.name);
  const borrow = borrowRows(rows);
  const borrowSummary = borrowStats(borrow);
  // Active pools only reach the data; hide speculative pairs on the stock page.
  const allPools = liquidityRowsForTicker(asset.ticker);
  const pools = allPools.filter((r) => r.pairType !== "stock-other");
  const hiddenPools = allPools.length - pools.length;
  const organicPct = stats.organicShare === null ? null : stats.organicShare * 100;
  // Same depth floor as the home page, so a thin pool never headlines.
  const bestPool =
    pools
      .filter((r) => r.pairType === "stock-stable" && r.apyBase !== null && r.volumeWindowHours == null && r.tvlUsd >= 250_000)
      .sort((a, b) => b.apyBase! - a.apyBase!)[0] ?? null;

  const faq = stockFaq(asset, rows);

  return (
    <>
      <JsonLd
        data={[
          datasetLd({
            name: `Yield on tokenized ${asset.ticker} (${asset.name})`,
            description:
              `Every venue that accepts a tokenized ${asset.ticker}, with base interest and ` +
              `token incentives shown separately.`,
            url: `/stock/${asset.ticker.toLowerCase()}`,
            modified: loadLatestSnapshot()?.fetchedAt ?? null,
            variables: ["APY", "Base APY", "Reward APY", "TVL in USD", "Lockup", "Chain"],
          }),
          itemListLd(rows, `Ways to earn on tokenized ${asset.ticker}`),
          faqLd(faq),
          breadcrumbLd([
            { name: BRAND_NAME, path: "/" },
            { name: asset.ticker, path: `/stock/${asset.ticker.toLowerCase()}` },
          ]),
        ]}
      />

      <nav className="mb-4 text-xs text-fg-subtle">
        <Link href="/earn" className="hover:text-fg">
          Earn
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
        ) : (
          <>
            As of {asOf}, no venue pays interest on a tokenized {asset.ticker}; the {rows.length} below accept
            it as collateral only.
          </>
        )}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile category="earn" label="Best deposit rate" value={formatApy(stats.maxApy)} note={best?.platform.name ?? "none found"} />
        <Tile
          category="liquidity"
          label="Best LP fee APY"
          value={bestPool ? formatApy(bestPool.apyBase) : "—"}
          note={bestPool ? `${bestPool.venue.name} · ${formatUsd(bestPool.tvlUsd)} TVL` : "no deep stablecoin pool"}
        />
        <Tile
          category="borrow"
          label="Max LTV"
          value={formatLtv(borrowSummary.maxLtv)}
          note={borrowSummary.cheapest ? `from ${borrowSummary.cheapest.borrow!.borrowApr?.toFixed(2)}%` : undefined}
        />
        <Tile
          tone="warn"
          label="Real interest"
          value={organicPct === null ? "—" : `${organicPct.toFixed(1)}%`}
          note="share of deposit yield"
        />
      </dl>

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <CategoryIcon category="earn" size={18} /> Deposit {asset.ticker}
        </h2>
        <OpportunityTable rows={rows} />
      </section>

      {pools.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <CategoryIcon category="liquidity" size={18} /> Provide liquidity
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
            <CategoryIcon category="borrow" size={18} /> Borrow against it
            <InfoTip text="Max LTV is the liquidation line, not a target: borrowing near it invites liquidation on an ordinary day's move." />
          </h2>
          <BorrowTable rows={borrow} compact />
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          Which {asset.ticker} token?
          <InfoTip text="The same share exists as several tokens. They are not interchangeable: each issuer has its own chain, redemption rules and venues." />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(byIssuer).map(([issuerName, issuerRows]) => {
            const list = issuerRows ?? [];
            const first = list[0];
            if (!first) return null;
            const bestHere = list.reduce((a, b) => ((b.apyTotal ?? 0) > (a.apyTotal ?? 0) ? b : a));
            return (
              <div key={issuerName} className="flex items-center gap-3 rounded-xl border bg-bg-raised p-4" title={first.issuer.structure_note}>
                <IssuerLogo id={first.issuer.id} name={issuerName} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{issuerName.replace(/ \(.*\)$/, "")}</p>
                  <p className="truncate text-xs text-fg-subtle">
                    {[...new Set(list.map((r) => r.token.symbol))].join(", ")} · {[...new Set(list.map((r) => r.chain))].join(", ")}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatApy(bestHere.apyTotal)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <LearnMore
        posts={["earning-on-tokenized-stocks-what-to-know", "providing-liquidity-with-tokenized-stocks", "borrowing-against-tokenized-stocks-risks"]}
      />

      <Faq entries={faq} title={`Questions about tokenized ${asset.ticker}`} />

      {rows.some((r) => r.riskNotes) && (
        <details className="mx-auto mt-4 max-w-3xl rounded-xl border bg-bg-raised px-5 py-3.5">
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
