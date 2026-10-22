import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { BorrowTable } from "@/components/BorrowTable";
import { LiquidityTable } from "@/components/LiquidityTable";
import { OpportunityTable } from "@/components/OpportunityTable";
import { StockLogo } from "@/components/StockLogo";
import { Stat, StatStrip } from "@/components/Stat";
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
    alternates: { canonical: `/stock/${asset.ticker.toLowerCase()}` },
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
        <StockLogo ticker={asset.ticker} name={asset.name} size={40} />
        <h1 className="text-3xl font-semibold tracking-tight">
          Earn yield on tokenized {asset.ticker}
        </h1>
      </div>
      <p className="mt-1 text-sm text-fg-subtle">
        {asset.name} · {asset.type === "etf" ? "ETF" : "Stock"} · {rows.length} venues tracked
      </p>

      {/* Answer-first paragraph: dated, specific, with the incentive split spelled out. */}
      <p className="mt-4 max-w-3xl text-[17px] leading-relaxed text-fg-muted">
        {best ? (
          <>
            As of {asOf}, the highest rate on a tokenized {asset.ticker} is{" "}
            <strong className="text-fg">{formatApy(stats.maxApy)}</strong> on{" "}
            <strong className="text-fg">{best.platform.name}</strong> ({best.token.symbol} on{" "}
            {best.chain}), of which {formatPp(best.apyBase)} percentage points is interest and{" "}
            {formatPp(best.apyReward)} percentage points is token incentives. The median across
            all {stats.earnCount} earn venues is {formatApy(stats.medianApy)}.
          </>
        ) : (
          <>
            As of {asOf} we have not found a venue that pays interest on a tokenized{" "}
            {asset.ticker}. The {rows.length} venues below accept it as collateral only, which
            means it earns nothing while deposited.
          </>
        )}
      </p>

      <div className="mt-6">
        <StatStrip>
          <Stat label="Best rate" value={formatApy(stats.maxApy)} note={best?.platform.name ?? "none found"} />
          <Stat label="Median earn APY" value={formatApy(stats.medianApy)} tone="warn" />
          <Stat
            label="Of that, real interest"
            value={organicPct === null ? "—" : `${organicPct.toFixed(1)}%`}
            tone="warn"
          />
          <Stat label="Value deposited" value={formatUsd(stats.tvlUsd)} />
        </StatStrip>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">
          Every venue that takes a tokenized {asset.ticker}
        </h2>
        <OpportunityTable rows={rows} />
      </section>

      {borrow.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 text-lg font-semibold">
            Borrow against your {asset.ticker}
          </h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-fg-muted">
            Keeping the exposure and borrowing against it is what most of these venues are
            built for.{" "}
            {borrowSummary.maxLtv !== null && (
              <>
                You can draw up to{" "}
                <strong className="text-fg">{formatLtv(borrowSummary.maxLtv)}</strong> of your{" "}
                {asset.ticker} position
                {borrowSummary.cheapest && (
                  <>
                    , and the cheapest loan we track costs{" "}
                    <strong className="text-fg">
                      {borrowSummary.cheapest.borrow!.borrowApr?.toFixed(2)}%
                    </strong>{" "}
                    on {borrowSummary.cheapest.platform.name}
                  </>
                )}
                . Borrowing near the maximum invites liquidation on an ordinary day&rsquo;s
                move.
              </>
            )}
          </p>
          <BorrowTable rows={borrow} compact />
        </section>
      )}

      {pools.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 text-lg font-semibold">Provide liquidity with {asset.ticker}</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-fg-muted">
            {pools.length} {pools.length === 1 ? "pool pairs" : "pools pair"} a tokenized{" "}
            {asset.ticker} with another asset. Fee APY is paid by traders; every rate is before
            impermanent loss, and concentrated pools only earn while the price is in range.
            {hiddenPools > 0 && (
              <>
                {" "}
                {hiddenPools} speculative pairs are hidden here;{" "}
                <Link href="/liquidity" className="text-accent underline underline-offset-2">
                  see all
                </Link>
                .
              </>
            )}
          </p>
          <LiquidityTable rows={pools} />
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Which {asset.ticker} token do you hold?</h2>
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-fg-muted">
          The same share exists as several different tokens. They are not interchangeable: each
          issuer has its own chain, its own redemption rules and its own set of venues.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(byIssuer).map(([issuerName, issuerRows]) => {
            const list = issuerRows ?? [];
            const first = list[0];
            if (!first) return null;
            const bestHere = list.reduce((a, b) => ((b.apyTotal ?? 0) > (a.apyTotal ?? 0) ? b : a));
            return (
              <div key={issuerName} className="rounded-lg border bg-bg-raised p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-medium">{issuerName}</h3>
                  <span className="tnum text-sm text-fg-muted">
                    best {formatApy(bestHere.apyTotal)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-fg-subtle">
                  {[...new Set(list.map((r) => r.token.symbol))].join(", ")} ·{" "}
                  {[...new Set(list.map((r) => r.chain))].join(", ")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {first.issuer.structure_note}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="mb-4 text-lg font-semibold">
          Common questions about tokenized {asset.ticker}
        </h2>
        <dl className="space-y-5">
          {faq.map((entry) => (
            <div key={entry.question}>
              <dt className="font-medium">{entry.question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fg-muted">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="mb-3 text-lg font-semibold">
          What to know before depositing {asset.ticker}
        </h2>
        <ul className="space-y-3">
          {[...new Map(rows.filter((r) => r.riskNotes).map((r) => [r.platform.id, r])).values()].map(
            (row) => (
              <li key={row.platform.id} className="text-sm leading-relaxed">
                <span className="font-medium">{row.platform.name}: </span>
                <span className="text-fg-muted">{row.riskNotes}</span>
              </li>
            ),
          )}
        </ul>
      </section>
    </>
  );
}
