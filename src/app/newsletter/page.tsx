import type { Metadata } from "next";
import { CalendarClock, Inbox, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { PlatformLogo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { StockLogo } from "@/components/StockLogo";
import { getHomeData } from "@/lib/data/home";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { formatApy, formatDate, formatLtv } from "@/lib/format";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { BRAND_NAME, NEWSLETTER, OG_IMAGE } from "@/config";
import { signupErrorMessage } from "@/lib/newsletter";

export const revalidate = 3600;

const DESCRIPTION =
  "A free weekly email with the best tokenized-stock pools and updated yields: where to earn, " +
  "provide liquidity or borrow against xStocks, Ondo, Coinbase and Robinhood tokens.";

export const metadata: Metadata = {
  title: "Weekly newsletter: the best tokenized-stock yields",
  description: DESCRIPTION,
  alternates: { canonical: "/newsletter" },
  openGraph: { images: [OG_IMAGE], title: `${NEWSLETTER.name} · ${BRAND_NAME}`, description: DESCRIPTION },
};

export default async function NewsletterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Only codes we issued map to a message; any other text in the URL is ignored.
  const error = signupErrorMessage((await searchParams).error);
  const d = getHomeData();
  const asOf = formatDate(loadLatestSnapshot()?.fetchedAt ?? null);

  // A preview of an issue, built from this week's live numbers.
  const preview: { category: CategoryKey; items: { ticker: string; title: string; platform: { id: string; name: string }; value: string }[] }[] = [
    { category: "earn", items: d.topEarn.map((r) => ({ ticker: r.underlying.ticker, title: r.token.symbol, platform: r.platform, value: formatApy(r.apyTotal) })) },
    { category: "liquidity", items: d.topLiquidity.map((r) => ({ ticker: r.underlyings[0], title: r.legs.map((l) => l.symbol).join(" / "), platform: r.venue, value: formatApy(r.apyBase) })) },
    { category: "borrow", items: d.topBorrow.map((r) => ({ ticker: r.underlying.ticker, title: `${r.token.symbol} → ${r.borrow!.loanAsset}`, platform: r.platform, value: `${formatLtv(r.borrow!.ltv)} LTV` })) },
  ];

  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: BRAND_NAME, path: "/" }, { name: "Newsletter", path: "/newsletter" }])]} />
      <section className="grid items-start gap-10 lg:grid-cols-[1fr_1fr]">
        <div className="lg:pt-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{NEWSLETTER.headline}</h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-fg-muted">{NEWSLETTER.promise}</p>
          <div className="mt-6 max-w-xl">
            {error && (
              <p role="alert" className="mb-3 rounded-lg border border-warn/40 bg-warn-subtle px-3 py-2 text-sm text-warn">
                {error}
              </p>
            )}
            <NewsletterForm source="newsletter-page" />
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            <Point icon={<CalendarClock size={18} />} title="Weekly">One email, every week. Nothing else.</Point>
            <Point icon={<Inbox size={18} />} title="Actionable">Best pools, new and ended programmes, cheapest borrowing.</Point>
            <Point icon={<ShieldCheck size={18} />} title="Independent">No paid placements. Same data as the site.</Point>
          </ul>
        </div>

        {/* What an issue looks like, with this week's real numbers. */}
        <figure className="rounded-2xl border bg-bg-raised shadow-card">
          <div className="flex items-center justify-between border-b px-5 py-3 text-xs text-fg-subtle">
            <span>From: {NEWSLETTER.name}</span>
            <span>Preview · data as of {asOf}</span>
          </div>
          <div className="space-y-5 p-5">
            <p className="text-lg font-semibold">This week in tokenized-stock yield</p>
            {preview.map((sec) => (
              <div key={sec.category}>
                <p className="kicker mb-2">
                  {CATEGORIES[sec.category].title}
                </p>
                <ul className="divide-y rounded-lg border">
                  {sec.items.map((it) => (
                    <li key={`${it.title}-${it.platform.id}`} className="flex items-center gap-3 px-3 py-2.5">
                      <StockLogo ticker={it.ticker} size={26} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{it.title}</span>
                        <span className="flex items-center gap-1 text-xs text-fg-subtle">
                          <PlatformLogo id={it.platform.id} name={it.platform.name} size={14} />
                          {it.platform.name}
                        </span>
                      </span>
                      <span className="tabular-nums text-sm font-semibold">{it.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <figcaption className="sr-only">A preview of a {NEWSLETTER.name} issue using this week&rsquo;s live data.</figcaption>
        </figure>
      </section>
    </>
  );
}

function Point({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border bg-bg-raised p-4">
      <span aria-hidden="true" className="text-accent">{icon}</span>
      <p className="mt-2 font-semibold">{title}</p>
      <p className="mt-0.5 text-sm text-fg-muted">{children}</p>
    </li>
  );
}
