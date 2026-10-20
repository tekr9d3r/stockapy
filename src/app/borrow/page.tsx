import type { Metadata } from "next";
import Link from "next/link";
import { BorrowTable } from "@/components/BorrowTable";
import { JsonLd } from "@/components/JsonLd";
import { Stat, StatStrip } from "@/components/Stat";
import { borrowRows, borrowStats } from "@/lib/data/rows";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { formatDate, formatLtv } from "@/lib/format";
import { breadcrumbLd, datasetLd, faqLd } from "@/lib/seo/jsonld";
import { BRAND_NAME } from "@/config";

export const revalidate = 3600;

const DESCRIPTION =
  "Every venue that accepts a tokenized stock as collateral, with the maximum loan-to-value, " +
  "what you can borrow against it and what that loan costs. Updated hourly.";

export const metadata: Metadata = {
  title: "Borrow against tokenized stocks",
  description: DESCRIPTION,
  alternates: { canonical: "/borrow" },
  openGraph: { title: `Borrow against tokenized stocks · ${BRAND_NAME}`, description: DESCRIPTION },
};

export default function BorrowPage() {
  const rows = borrowRows();
  const stats = borrowStats(rows);
  const asOf = formatDate(loadLatestSnapshot()?.fetchedAt ?? null);
  const cheapest = stats.cheapest;
  const withLtv = rows.filter((r) => r.borrow?.ltv !== null).length;

  const faq = [
    {
      question: "Can you borrow against a tokenized stock?",
      answer:
        `Yes. As of ${asOf} we track ${rows.length} markets that accept a tokenized stock as ` +
        `collateral, across Kamino, Jupiter Lend, Morpho and Aave. The maximum loan-to-value ` +
        `we see is ${formatLtv(stats.maxLtv)}, and the median cost of borrowing is ` +
        `${stats.medianApr === null ? "unknown" : `${stats.medianApr.toFixed(2)}%`} a year.`,
    },
    {
      question: "What is the cheapest way to borrow against a tokenized stock?",
      answer: cheapest
        ? `The cheapest market we track is ${cheapest.platform.name}` +
          `${cheapest.variant ? ` (${cheapest.variant})` : ""}, borrowing ` +
          `${cheapest.borrow!.loanAsset} against ${cheapest.token.symbol} at ` +
          `${cheapest.borrow!.borrowApr?.toFixed(2)}% with a maximum LTV of ` +
          `${formatLtv(cheapest.borrow!.ltv)}. A low rate usually reflects a small or quiet ` +
          `market, so check the depth before borrowing size.`
        : "We have no borrow rates collected at the moment.",
    },
    {
      question: "Why borrow against a tokenized stock instead of selling it?",
      answer:
        "Borrowing keeps your exposure to the share and avoids realising a taxable disposal, " +
        "which is the usual reason people do it. The cost is a liquidation price: tokenized " +
        "stocks trade around the clock while the underlying exchange does not, so the oracle " +
        "has to quote a price over the weekend and the reopening gap can liquidate you before " +
        "you can react.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          datasetLd({
            name: "Borrowing against tokenized stocks",
            description: DESCRIPTION,
            url: "/borrow",
            modified: loadLatestSnapshot()?.fetchedAt ?? null,
            variables: ["Maximum LTV", "Borrow APR", "Loan asset", "Chain"],
          }),
          faqLd(faq),
          breadcrumbLd([
            { name: BRAND_NAME, path: "/" },
            { name: "Borrow", path: "/borrow" },
          ]),
        ]}
      />

      <section className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Borrow against tokenized stocks
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-fg-muted">
          Lending your tokenized stock out pays almost nothing. Posting it as collateral and
          borrowing against it is the thing these venues are actually built for. As of {asOf} we
          track <strong className="text-fg">{rows.length} borrow markets</strong> across{" "}
          {new Set(rows.map((r) => r.platform.name)).size} platforms, with a maximum
          loan-to-value of <strong className="text-fg">{formatLtv(stats.maxLtv)}</strong>
          {cheapest && (
            <>
              {" "}
              and rates from{" "}
              <strong className="text-fg">{cheapest.borrow!.borrowApr?.toFixed(2)}%</strong> on{" "}
              {cheapest.platform.name}
            </>
          )}
          .
        </p>
      </section>

      <section className="mb-8">
        <StatStrip>
          <Stat
            label="Borrow markets"
            value={String(rows.length)}
            note={`${withLtv} with a published LTV`}
          />
          <Stat label="Highest LTV" value={formatLtv(stats.maxLtv)} note="Before liquidation buffer" />
          <Stat
            label="Median borrow cost"
            value={stats.medianApr === null ? "—" : `${stats.medianApr.toFixed(2)}%`}
            note="Annual interest"
          />
          <Stat label="Loan assets" value={String(stats.loanAssets.length)} note={stats.loanAssets.join(", ")} />
        </StatStrip>
      </section>

      <section className="mb-12">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Every borrow market we track</h2>
          <p className="text-xs text-fg-subtle">
            Refreshed hourly ·{" "}
            <Link href="/methodology" className="underline hover:text-fg">
              how we collect this
            </Link>
          </p>
        </div>
        <BorrowTable rows={rows} />
      </section>

      <section className="mb-12 grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="mb-1.5 font-medium">Max LTV is not a target</h3>
          <p className="text-sm leading-relaxed text-fg-muted">
            It is the line at which you are liquidated, not a sensible borrowing level. A
            position opened near the maximum is liquidated by an ordinary day&rsquo;s move in
            the share price.
          </p>
        </div>
        <div>
          <h3 className="mb-1.5 font-medium">The weekend is the real risk</h3>
          <p className="text-sm leading-relaxed text-fg-muted">
            The share stops trading on Friday; the token does not. An oracle still has to quote
            a price, and the gap when the market reopens can liquidate a position nobody was
            awake to defend. This risk does not exist when you hold the share itself.
          </p>
        </div>
        <div>
          <h3 className="mb-1.5 font-medium">The lend side is a different trade</h3>
          <p className="text-sm leading-relaxed text-fg-muted">
            Morpho&rsquo;s interface shows a &ldquo;Lend Rate&rdquo; on each of these markets,
            and some are high. It is not yield on your stock: in a Morpho Blue market the
            lender supplies the loan asset and the collateral is never lent out. To earn it
            you deposit USDG or USDC, not shares.
          </p>
        </div>
        <div>
          <h3 className="mb-1.5 font-medium">A cheap rate usually means a quiet market</h3>
          <p className="text-sm leading-relaxed text-fg-muted">
            Borrow rates fall when nobody is borrowing. The lowest numbers here sit in markets
            holding a few hundred thousand dollars, where your own loan would move the rate.
          </p>
        </div>
      </section>

      <section className="max-w-3xl">
        <h2 className="mb-4 text-lg font-semibold">Common questions</h2>
        <dl className="space-y-5">
          {faq.map((entry) => (
            <div key={entry.question}>
              <dt className="font-medium">{entry.question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fg-muted">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
