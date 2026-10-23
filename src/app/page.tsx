import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Database, RefreshCw, ShieldCheck } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { CategoryBadgeIcon, CategoryIcon } from "@/components/CategoryIcon";
import { Faq } from "@/components/Faq";
import { InfoTip } from "@/components/InfoTip";
import { JsonLd } from "@/components/JsonLd";
import { ChainLogo, IssuerLogo, PlatformLogo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { StockLogo } from "@/components/StockLogo";
import { listPosts } from "@/lib/content/posts";
import { getHomeData, type LiquidityRow, type Row } from "@/lib/data/home";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { formatApy, formatDate, formatLtv, formatUsd } from "@/lib/format";
import { datasetLd, faqLd, organizationLd, webSiteLd } from "@/lib/seo/jsonld";
import { BRAND_NAME, SITE_DESCRIPTION, SOCIAL } from "@/config";

export const revalidate = 3600;

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
  const posts = listPosts().slice(0, 3);
  const organicPct = d.earn.organicShare === null ? null : d.earn.organicShare * 100;
  const bestLp = d.topLiquidity[0] ?? null;

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

      {/* ---------- Hero ---------- */}
      <section className="relative mb-14 grid items-center gap-10 pt-2 pb-4 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border bg-bg-raised px-3 py-1 text-xs font-medium text-fg-muted">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-positive" />
            </span>
            Live · {d.counts.markets} markets · updated {asOf}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Make your tokenized stocks <span className="text-accent">work for you</span>
          </h1>
          {/* Answer-first: the sentence an answer engine should lift. */}
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-fg-muted">
            As of {asOf}: earn up to <strong className="text-fg">{formatApy(d.earn.maxApy)}</strong> by depositing,
            a median <strong className="text-fg">{formatApy(d.lq.medianFeeApy)}</strong> in trading fees, or borrow at up to{" "}
            <strong className="text-fg">{formatLtv(d.borrow.maxLtv)}</strong> LTV — across {d.platforms.length} protocols.
          </p>
          <div className="mt-6 max-w-xl">
            <NewsletterForm source="hero" />
          </div>
        </div>

        <div className="grid gap-3">
          <HeroTile
            category="earn"
            label="Earn by depositing"
            value={`up to ${formatApy(d.earn.maxApy)}`}
            note={`median ${formatApy(d.earn.medianApy)} · ${d.counts.earn} venues`}
          />
          <HeroTile
            category="liquidity"
            label="Earn trading fees"
            value={`${formatApy(d.lq.medianFeeApy)} median`}
            note={bestLp ? `best deep pool ${formatApy(bestLp.apyBase)} on ${bestLp.venue.name}` : `${d.counts.liquidity} active pools`}
          />
          <HeroTile
            category="borrow"
            label="Borrow against it"
            value={`up to ${formatLtv(d.borrow.maxLtv)} LTV`}
            note={d.borrow.medianApr !== null ? `median cost ${d.borrow.medianApr.toFixed(2)}% · ${d.counts.borrow} markets` : `${d.counts.borrow} markets`}
          />
        </div>
      </section>

      {/* ---------- Three ways ---------- */}
      <section className="mb-16" aria-labelledby="three-ways">
        <SectionHead
          id="three-ways"
          eyebrow="The best of each, right now"
          title="Three ways to put a tokenized stock to work"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <WayCard
            category="earn"
            what="Deposit it, get paid a rate."
            count={d.counts.earn}
          >
            {d.topEarn.map((r) => (
              <EarnPick key={r.id} r={r} />
            ))}
          </WayCard>
          <WayCard
            category="liquidity"
            what="Pair it in a DEX pool, earn trading fees."
            count={d.counts.liquidity}
          >
            {d.topLiquidity.map((r) => (
              <LiquidityPick key={r.id} r={r} />
            ))}
          </WayCard>
          <WayCard
            category="borrow"
            what="Borrow stablecoins without selling it."
            count={d.counts.borrow}
          >
            {d.topBorrow.map((r) => (
              <BorrowPick key={r.id} r={r} />
            ))}
          </WayCard>
        </div>
      </section>

      {/* ---------- Pick your stock ---------- */}
      <section className="mb-16" aria-labelledby="by-stock">
        <SectionHead
          id="by-stock"
          eyebrow={`${d.stocks.length} stocks`}
          title="Pick your stock"
          tip="The best rate in each category for every stock. LP fees count only stablecoin pools holding $250k or more."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {d.stocks.map((s) => (
            <Link
              key={s.ticker}
              href={`/stock/${s.ticker.toLowerCase()}`}
              className="group rounded-xl border bg-bg-raised p-4 transition hover:border-border-strong hover:shadow-card"
            >
              <div className="flex items-center gap-2.5">
                <StockLogo ticker={s.ticker} size={32} />
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{s.ticker}</p>
                  <p className="truncate text-xs text-fg-subtle">{s.name}</p>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-xs">
                <StockStat category="earn" label="Earn" value={s.bestEarn === null ? "—" : formatApy(s.bestEarn)} />
                <StockStat category="liquidity" label="LP fees" value={s.bestFee === null ? "—" : formatApy(s.bestFee)} />
                <StockStat category="borrow" label="Max LTV" value={s.maxLtv === null ? "—" : formatLtv(s.maxLtv)} />
              </dl>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Coverage / trust ---------- */}
      <section className="mb-16 rounded-2xl border bg-bg-subtle p-6 sm:p-8" aria-labelledby="coverage">
        <SectionHead
          id="coverage"
          eyebrow="Independent and open"
          title="Tracked across every major venue"
        />
        <LogoRow title="Protocols">
          {d.platforms.map((p) => (
            <LogoChip key={p.id} name={p.name}>
              <PlatformLogo id={p.id} name={p.name} size={36} />
            </LogoChip>
          ))}
        </LogoRow>
        <LogoRow title="Issuers">
          {d.issuers.map((i) => (
            <LogoChip key={i.id} name={i.name.replace(/ \(.*\)$/, "")}>
              <IssuerLogo id={i.id} name={i.name} size={36} />
            </LogoChip>
          ))}
        </LogoRow>
        <LogoRow title="Chains">
          {d.chains.map((c) => (
            <LogoChip key={c} name={c}>
              <ChainLogo chain={c} size={36} />
            </LogoChip>
          ))}
        </LogoRow>
        <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <Proof icon={<RefreshCw size={16} />}>Hourly · {asOf}</Proof>
          <Proof icon={<Database size={16} />}>
            <Link href="/developers" className="underline underline-offset-2">Open data &amp; API</Link>
          </Proof>
          <Proof icon={<ShieldCheck size={16} />}>
            No paid placements ·{" "}
            <a href={SOCIAL.github} target="_blank" rel="noopener" className="underline underline-offset-2">
              open source<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Proof>
        </ul>
      </section>

      {/* ---------- Knowledge Hub ---------- */}
      {posts.length > 0 && (
        <section className="mb-16" aria-labelledby="from-hub">
          <div className="flex items-end justify-between gap-4">
            <SectionHead id="from-hub" eyebrow="Knowledge Hub" title="Learn before you deposit" />
            <Link href="/hub" className="mb-6 hidden items-center gap-1 text-sm font-medium text-accent hover:underline sm:inline-flex">
              All articles <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.slug} href={`/hub/${p.slug}`} className="group flex flex-col rounded-xl border bg-bg-raised p-5 transition hover:border-border-strong hover:shadow-card">
                <CategoryBadgeIcon category="hub" size={36} />
                <h3 className="mt-3 font-semibold leading-snug group-hover:text-accent">{p.title}</h3>
                <p className="mt-auto pt-3 text-xs text-fg-subtle">
                  <time dateTime={p.datePublished}>{formatDate(p.datePublished)}</time>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- FAQ ---------- */}
      <Faq entries={faq} />
    </>
  );
}

/* ---------------------------------------------------------------- pieces */

function SectionHead({ id, eyebrow, title, tip }: { id: string; eyebrow?: string; title: string; tip?: string }) {
  return (
    <div className="mb-5 max-w-2xl">
      {eyebrow && <p className="text-xs font-semibold tracking-widest text-fg-subtle uppercase">{eyebrow}</p>}
      <h2 id={id} className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
        {tip && <InfoTip text={tip} />}
      </h2>
    </div>
  );
}

function HeroTile({ category, label, value, note }: { category: CategoryKey; label: string; value: string; note: string }) {
  const c = CATEGORIES[category];
  return (
    <Link href={c.href} className="group flex items-center gap-4 rounded-2xl border bg-bg-raised p-4 shadow-card transition hover:border-border-strong">
      <CategoryBadgeIcon category={category} size={48} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-fg-muted uppercase">{label}</p>
        <p className={`tabular-nums text-2xl font-semibold tracking-tight ${c.cls.text}`}>{value}</p>
        <p className="truncate text-xs text-fg-subtle">{note}</p>
      </div>
      <ArrowRight size={18} aria-hidden="true" className="text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
    </Link>
  );
}

function WayCard({ category, what, count, children }: { category: CategoryKey; what: string; count: number; children: React.ReactNode }) {
  const c = CATEGORIES[category];
  return (
    <div className="flex flex-col rounded-2xl border bg-bg-raised shadow-card">
      <div className={`rounded-t-2xl border-b p-5 ${c.cls.subtle}`}>
        <div className="flex items-center gap-2.5">
          <CategoryIcon category={category} size={20} strokeWidth={2.25} />
          <h3 className="text-lg font-semibold">{c.title}</h3>
        </div>
        <p className="mt-1.5 text-sm text-fg-muted">{what}</p>
      </div>
      <ol className="flex-1 divide-y">{children}</ol>
      <Link href={c.href} className={`flex items-center justify-between rounded-b-2xl border-t px-5 py-3 text-sm font-medium ${c.cls.text} ${c.cls.hoverBg}`}>
        See all {count} <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}

function Pick({
  ticker,
  title,
  platform,
  chain,
  rate,
  rateLabel,
  action,
}: {
  ticker: string;
  title: string;
  platform: { id: string; name: string };
  chain: string;
  rate: string;
  rateLabel: string;
  action: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <StockLogo ticker={ticker} size={34} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-tight">{title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted">
          <PlatformLogo id={platform.id} name={platform.name} size={16} />
          <span className="truncate">{platform.name}</span>
          <ChainLogo chain={chain === "BSC" ? "BNB Chain" : chain} size={14} />
          <span className="truncate">{chain}</span>
        </p>
      </div>
      <div className="text-right">
        <p className="tabular-nums text-lg leading-tight font-semibold">{rate}</p>
        <p className="text-[10px] tracking-wide text-fg-subtle uppercase">{rateLabel}</p>
        <div className="mt-1.5">{action}</div>
      </div>
    </li>
  );
}

function EarnPick({ r }: { r: Row }) {
  return (
    <Pick
      ticker={r.underlying.ticker}
      title={r.token.symbol}
      platform={r.platform}
      chain={r.chain}
      rate={formatApy(r.apyTotal)}
      rateLabel={r.apyReward && r.apyTotal && r.apyReward / r.apyTotal > 0.5 ? "mostly incentives" : "APY"}
      action={<ActionButton href={r.deepLink} platform={r.platform.name} category="earn" specific={r.deepLinkIsSpecific} />}
    />
  );
}

function LiquidityPick({ r }: { r: LiquidityRow }) {
  return (
    <Pick
      ticker={r.underlyings[0]}
      title={r.legs.map((l) => l.symbol).join(" / ")}
      platform={{ id: r.venue.id, name: r.venue.name }}
      chain={r.chain}
      rate={formatApy(r.apyBase)}
      rateLabel={`fees · ${formatUsd(r.tvlUsd)}`}
      action={<ActionButton href={r.url} platform={r.venue.name} category="liquidity" />}
    />
  );
}

function BorrowPick({ r }: { r: Row }) {
  return (
    <Pick
      ticker={r.underlying.ticker}
      title={`${r.token.symbol} → ${r.borrow!.loanAsset}`}
      platform={r.platform}
      chain={r.chain}
      rate={`${formatLtv(r.borrow!.ltv)} LTV`}
      rateLabel={r.borrow!.borrowApr !== null ? `at ${r.borrow!.borrowApr.toFixed(2)}%` : "max LTV"}
      action={<ActionButton href={r.deepLink} platform={r.platform.name} category="borrow" specific={r.deepLinkIsSpecific} />}
    />
  );
}

function StockStat({ category, label, value }: { category: CategoryKey; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="flex items-center gap-1.5 text-fg-muted">
        <span aria-hidden="true" className={`size-1.5 rounded-full ${CATEGORIES[category].cls.bg}`} />
        {label}
      </dt>
      <dd className={`tabular-nums font-semibold ${value === "—" ? "text-fg-subtle" : "text-fg"}`}>{value}</dd>
    </div>
  );
}

function LogoRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first-of-type:mt-0">
      <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-fg-muted uppercase">{title}</h3>
      <ul className="flex flex-wrap gap-2">{children}</ul>
    </div>
  );
}

function LogoChip({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 rounded-xl border bg-bg-raised py-1.5 pr-3.5 pl-1.5 text-sm font-medium">
      {children}
      {name}
    </li>
  );
}

function Proof({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-fg-muted">
      <span aria-hidden="true" className="mt-0.5 text-positive">{icon}</span>
      <span>{children}</span>
    </li>
  );
}
