import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { InfoTip } from "@/components/InfoTip";
import { JsonLd } from "@/components/JsonLd";
import { ChainLogo, PlatformLogo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { StockLogo } from "@/components/StockLogo";
import { StockTile } from "@/components/StockTile";
import { listLessons, listPosts } from "@/lib/content/posts";
import { getHomeData, type LiquidityRow, type Row } from "@/lib/data/home";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { formatApy, formatDate, formatLtv, formatUsd } from "@/lib/format";
import { datasetLd, faqLd, organizationLd, webSiteLd } from "@/lib/seo/jsonld";
import { BRAND_NAME, SITE_DESCRIPTION, SOCIAL } from "@/config";

export const revalidate = 3600;

/** How many stocks the home grid shows; the rest are on /stocks. */
const HOME_STOCKS = 15;
/** Lessons shown in the "Start here" sidebar. */
const SIDEBAR_LESSONS = 3;

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: { "text/markdown": "/index.md", "application/json": "/api/v1/summary" },
  },
};

export default function Home() {
  const d = getHomeData();
  const fetchedAt = loadLatestSnapshot()?.fetchedAt ?? null;
  const asOf = formatDate(fetchedAt);
  const lessons = listLessons();
  const research = listPosts().find((p) => p.track !== "start");
  const organicPct = d.earn.organicShare === null ? null : d.earn.organicShare * 100;

  const faq = [
    {
      question: "What yield can you earn on tokenized stocks?",
      answer:
        `As of ${asOf}: depositing a tokenized stock pays up to ${formatApy(d.earn.maxApy)}, but the median ` +
        `deposit pays ${formatApy(d.earn.medianApy)}. Providing liquidity in a stock/stablecoin pool pays a ` +
        `median ${formatApy(d.lq.medianFeeApy)} in trading fees, before impermanent loss. And ${d.borrow.count} ` +
        `markets let you borrow against the stock, at up to ${formatLtv(d.borrow.maxLtv)} loan-to-value.`,
    },
    {
      question: "What is the best way to earn on a tokenized stock?",
      answer:
        "It depends on what you will accept. Trading fees from providing liquidity are the largest real " +
        "yield, but you carry impermanent loss. Deposit rates are mostly token incentives that can stop. " +
        "Borrowing pays nothing, but lets you raise cash without selling the shares.",
    },
    {
      question: "Can you borrow against tokenized stocks?",
      answer:
        `Yes. ${d.borrow.count} markets accept a tokenized stock as collateral, with a maximum loan-to-value ` +
        `of ${formatLtv(d.borrow.maxLtv)}` +
        (d.borrow.medianApr !== null ? ` and a median borrow cost of ${d.borrow.medianApr.toFixed(2)}% a year.` : "."),
    },
    {
      question: "How much of tokenized-stock yield is real interest?",
      answer:
        `Across the ${d.earn.splitKnownCount} deposit venues that disclose it, ${organicPct === null ? "an unknown share" : `${organicPct.toFixed(1)}%`} ` +
        "of the yield is interest paid by borrowers. The rest is token incentives, which end when the budget does.",
    },
    {
      question: `Where does ${BRAND_NAME} get its data?`,
      answer:
        "From DefiLlama, the Aave, Morpho and Raydium APIs, GeckoTerminal, and directly from on-chain " +
        "contracts, refreshed every hour. Every number carries its source and the time it was collected, " +
        "and the full dataset is published as open JSON and CSV.",
    },
  ];

  const picks = [
    ...d.topEarn.map((r) => ({ name: `${r.token.symbol} on ${r.platform.name}`, url: r.deepLink, rate: r.apyTotal, what: "deposit APY" })),
    ...d.topLiquidity.map((r) => ({ name: `${r.legs.map((l) => l.symbol).join("/")} on ${r.venue.name}`, url: r.url, rate: r.apyBase, what: "LP fee APY" })),
  ];

  return (
    <>
      <JsonLd
        data={[
          organizationLd(),
          webSiteLd(),
          datasetLd({
            name: "Tokenized stock yield, liquidity and borrowing opportunities",
            description: SITE_DESCRIPTION,
            url: "/",
            modified: fetchedAt,
            variables: ["APY", "Base APY", "Reward APY", "LP fee APY", "Max LTV", "Borrow APR", "TVL in USD"],
          }),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Best ways to earn on a tokenized stock right now",
            itemListElement: picks.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "FinancialProduct",
                name: p.name,
                url: p.url,
                ...(p.rate !== null ? { interestRate: { "@type": "QuantitativeValue", value: p.rate, unitText: "PERCENT" } } : {}),
                description: `${formatApy(p.rate)} ${p.what}, as of ${asOf}.`,
              },
            })),
          },
          faqLd(faq),
        ]}
      />

      {/* The page opens straight on the tables. The H1 is for search engines and screen readers. */}
      <h1 className="sr-only">Yield on tokenized stocks: lend, market-make or borrow against them</h1>

      <div className="grid gap-x-10 gap-y-12 lg:grid-cols-[1fr_300px]">
        {/* ---------- The opportunities ---------- */}
        <div className="min-w-0 space-y-12">
          {WAYS.map((w) => (
            <Way key={w.category} category={w.category} count={d.counts[w.category]} extraLabel={w.extraLabel} rateLabel={w.rateLabel}>
              {w.category === "earn" && d.topEarn.map((r) => <EarnPick key={r.id} r={r} />)}
              {w.category === "liquidity" && d.topLiquidity.map((r) => <LiquidityPick key={r.id} r={r} />)}
              {w.category === "borrow" && d.topBorrow.map((r) => <BorrowPick key={r.id} r={r} />)}
            </Way>
          ))}
          {/* Answer-first, for search and answer engines: the dated headline numbers in one sentence. */}
          <p className="text-xs text-fg-subtle">
            As of {asOf}: up to {formatApy(d.earn.maxApy)} for lending, a median {formatApy(d.lq.medianFeeApy)} in
            market-making fees, borrowing at up to {formatLtv(d.borrow.maxLtv)} of the stock&apos;s value. Rates change
            hourly · not financial advice.
          </p>
        </div>

        {/* ---------- Sidebar: the way in for newcomers, then the newsletter ---------- */}
        <aside className="space-y-10 lg:border-l lg:pl-8">
          {lessons.length > 0 && (
            <section aria-labelledby="start-here">
              <h2 id="start-here" className="text-xl tracking-tight">New to this? Start here</h2>
              <ol className="mt-3 divide-y border-t">
                {lessons.slice(0, SIDEBAR_LESSONS).map((p, i) => (
                  <li key={p.slug}>
                    <Link href={`/hub/${p.slug}`} className="group flex gap-3 py-3">
                      <span className="font-[family-name:var(--font-display)] text-xl text-fg-subtle tabular-nums">{i + 1}</span>
                      <span className="font-[family-name:var(--font-display)] text-lg leading-snug group-hover:underline">
                        {p.lessonTitle ?? p.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <Link href="/hub" className="mt-2 inline-block text-sm text-accent underline-offset-2 hover:underline">
                All {lessons.length} lessons
              </Link>
            </section>
          )}

          <section aria-labelledby="weekly" className="border-t-2 border-fg pt-4">
            <h2 id="weekly" className="text-xl tracking-tight">The weekly letter</h2>
            <p className="mt-1 text-sm text-fg-muted">
              The best rates and what changed, once a week. Free.
            </p>
            <div className="mt-3">
              <NewsletterForm source="home-picks" />
            </div>
          </section>

          {research && (
            <section aria-labelledby="research" className="border-t-2 border-fg pt-4">
              <h2 id="research" className="text-xl tracking-tight">Analysis</h2>
              <Link href={`/hub/${research.slug}`} className="group mt-2 block">
                <span className="font-[family-name:var(--font-display)] text-lg leading-snug group-hover:underline">{research.title}</span>
                <time dateTime={research.datePublished} className="mt-1 block text-xs text-fg-subtle">
                  {formatDate(research.datePublished)}
                </time>
              </Link>
            </section>
          )}
        </aside>
      </div>

      {/* ---------- Pick your stock ---------- */}
      <section className="mt-16 border-t-2 border-fg pt-4" aria-labelledby="by-stock">
        <h2 id="by-stock" className="flex items-center gap-2 text-3xl tracking-tight">
          Pick your stock
          <InfoTip text="The best rate in each category, for the stocks with the most money moving through their markets. Market-make: the best stablecoin pool holding $250k or more, or else the best one with a full day of data." />
        </h2>
        <p className="mt-1 text-sm text-fg-muted">Most active right now. Each stock page lists every token and market for that company.</p>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {d.stocks.slice(0, HOME_STOCKS).map((s) => (
            <StockTile key={s.ticker} s={s} />
          ))}
        </div>
        {d.stocks.length > HOME_STOCKS && (
          <Link href="/stocks" className="mt-6 inline-block text-sm text-accent underline-offset-2 hover:underline">
            All {d.stocks.length} stocks
          </Link>
        )}
      </section>

      {/* ---------- Coverage / trust ---------- */}
      <section className="mt-16 border-t-2 border-fg pt-4" aria-labelledby="coverage">
        <h2 id="coverage" className="text-3xl tracking-tight">Independent and open</h2>
        <dl className="mt-3 grid gap-6 text-sm sm:grid-cols-3">
          <Coverage title={`${d.platforms.length} platforms`} names={d.platforms.map((p) => p.name)} />
          <Coverage title={`${d.issuers.length} issuers`} names={d.issuers.map((i) => i.name.replace(/ \(.*\)$/, ""))} />
          <Coverage title={`${d.chains.length} chains`} names={d.chains} />
        </dl>
        <p className="mt-6 text-sm text-fg-muted">
          Refreshed hourly · no paid placements ·{" "}
          <Link href="/methodology" className="underline underline-offset-2 hover:text-fg">methodology</Link> ·{" "}
          <Link href="/developers" className="underline underline-offset-2 hover:text-fg">open data and API</Link> ·{" "}
          <a href={SOCIAL.github} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-fg">
            open source<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </section>

      {/* ---------- FAQ ---------- */}
      <div className="mt-16">
        <Faq entries={faq} />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- pieces */

const WAYS: { category: "earn" | "liquidity" | "borrow"; extraLabel: string; rateLabel: string }[] = [
  { category: "earn", extraLabel: "Money in", rateLabel: "Yield / yr" },
  { category: "liquidity", extraLabel: "Money in pool", rateLabel: "Fee yield / yr" },
  { category: "borrow", extraLabel: "Borrow up to", rateLabel: "Interest / yr" },
];

const COMPARE_NOUN: Record<string, string> = { earn: "places to lend", liquidity: "trading pools", borrow: "borrowing markets" };

/** One way to earn: plain-English name, its TradFi equivalent, the top five, and the way to the full table. */
function Way({
  category,
  count,
  extraLabel,
  rateLabel,
  children,
}: {
  category: CategoryKey;
  count: number;
  extraLabel: string;
  rateLabel: string;
  children: React.ReactNode;
}) {
  const c = CATEGORIES[category];
  return (
    <section id={category} aria-labelledby={`${category}-h`} className="scroll-mt-24">
      <h2 id={`${category}-h`} className="text-3xl tracking-tight">{c.title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-fg-muted">
        {c.tradfi}{" "}
        <Link href={`/hub/${c.lesson}`} className="text-accent underline-offset-2 hover:underline">How it works</Link>
      </p>
      <table className="mt-4 w-full border-t border-fg text-sm">
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="kicker py-2 pr-3">Stock</th>
            <th scope="col" className="kicker hidden py-2 pr-3 sm:table-cell">Platform</th>
            <th scope="col" className="kicker hidden py-2 pr-3 md:table-cell">Chain</th>
            <th scope="col" className="kicker hidden py-2 pr-3 text-right sm:table-cell">{extraLabel}</th>
            <th scope="col" className="kicker py-2 text-right">{rateLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
      <Link
        href={c.href}
        className="mt-3 inline-flex items-center gap-1 border-b border-fg pb-0.5 text-sm font-semibold hover:text-accent hover:border-accent"
      >
        Compare all {count} {COMPARE_NOUN[category]}
      </Link>
    </section>
  );
}

function Pick({
  href,
  ticker,
  title,
  sub,
  platform,
  chain,
  extra,
  extraSub,
  rate,
}: {
  /** The stock's page, at this category's table: every market for that stock, compared. */
  href: string;
  ticker: string;
  title: string;
  /** Second line under the token: the company, or the day's trading. */
  sub?: string;
  platform: { id: string; name: string };
  chain: string;
  extra: string;
  extraSub?: string;
  rate: string;
}) {
  const chainName = chain === "BSC" ? "BNB Chain" : chain;
  return (
    // The whole row is the link: the title's link stretches over it.
    <tr className="group relative transition-colors hover:bg-bg-subtle">
      <td className="py-3 pr-3">
        <div className="flex items-center gap-2.5">
          <StockLogo ticker={ticker} size={30} />
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">
              <Link href={href} className="after:absolute after:inset-0 group-hover:underline">
                {title}
              </Link>
            </p>
            {sub && <p className="mt-0.5 truncate text-xs text-fg-subtle">{sub}</p>}
            {/* Phone width: platform and chain fold under the token. */}
            <p className="mt-0.5 truncate text-xs text-fg-subtle sm:hidden">
              {platform.name} · {chainName}
            </p>
          </div>
        </div>
      </td>
      <td className="hidden py-3 pr-3 sm:table-cell">
        <span className="flex items-center gap-2">
          <PlatformLogo id={platform.id} name={platform.name} size={20} />
          {platform.name}
        </span>
        <span className="mt-0.5 block text-xs text-fg-subtle md:hidden">{chainName}</span>
      </td>
      <td className="hidden py-3 pr-3 md:table-cell">
        <span className="flex items-center gap-2 text-fg-muted">
          <ChainLogo chain={chainName} size={16} />
          {chainName}
        </span>
      </td>
      <td className="hidden py-3 pr-3 text-right tabular-nums sm:table-cell">
        {extra}
        {extraSub && <span className="mt-0.5 block text-xs text-fg-subtle">{extraSub}</span>}
      </td>
      <td className="py-3 text-right font-[family-name:var(--font-display)] text-xl tabular-nums">{rate}</td>
    </tr>
  );
}

function EarnPick({ r }: { r: Row }) {
  return (
    <Pick
      href={`/stock/${r.underlying.ticker.toLowerCase()}#lend`}
      ticker={r.underlying.ticker}
      title={r.token.symbol}
      sub={r.underlying.name}
      platform={r.platform}
      chain={r.chain}
      extra={r.tvlUsd !== null ? formatUsd(r.tvlUsd) : "—"}
      rate={formatApy(r.apyTotal)}
    />
  );
}

function LiquidityPick({ r }: { r: LiquidityRow }) {
  return (
    <Pick
      href={`/stock/${r.underlyings[0].toLowerCase()}#market-make`}
      ticker={r.underlyings[0]}
      title={r.legs.map((l) => l.symbol).join(" / ")}
      sub={`${formatUsd(r.volumeUsd1d)} traded today`}
      platform={{ id: r.venue.id, name: r.venue.name }}
      chain={r.chain}
      extra={formatUsd(r.tvlUsd)}
      rate={formatApy(r.apyBase)}
    />
  );
}

function BorrowPick({ r }: { r: Row }) {
  const b = r.borrow!;
  return (
    <Pick
      href={`/stock/${r.underlying.ticker.toLowerCase()}#borrow`}
      ticker={r.underlying.ticker}
      title={`${r.token.symbol} → ${b.loanAsset}`}
      sub={r.underlying.name}
      platform={r.platform}
      chain={r.chain}
      extra={formatLtv(b.ltv)}
      extraSub="of the stock's value"
      rate={b.borrowApr !== null ? `${b.borrowApr.toFixed(2)}%` : "—"}
    />
  );
}

function Coverage({ title, names }: { title: string; names: string[] }) {
  return (
    <div>
      <dt className="font-[family-name:var(--font-display)] text-xl">{title}</dt>
      <dd className="mt-1 leading-relaxed text-fg-muted">{names.join(", ")}</dd>
    </div>
  );
}
