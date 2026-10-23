import type { Metadata } from "next";
import Link from "next/link";
import { BorrowTable } from "@/components/BorrowTable";
import { CategoryTabs } from "@/components/CategoryTabs";
import { Faq } from "@/components/Faq";
import { InfoTip } from "@/components/InfoTip";
import { JsonLd } from "@/components/JsonLd";
import { LearnMore } from "@/components/LearnMore";
import { CategoryHeader, LogoStack, Tile } from "@/components/CategoryHeader";
import { PlatformLogo } from "@/components/Logo";
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
  alternates: {
    canonical: "/borrow",
    types: { "text/markdown": "/borrow.md", "application/json": "/api/v1/borrow" },
  },
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

      <CategoryTabs active="borrow" />

      <CategoryHeader
        category="borrow"
        title="Borrow against tokenized stocks"
        logos={
          <LogoStack caption={`${new Set(rows.map((r) => r.platform.id)).size} platforms · borrow ${stats.loanAssets.join(", ")}`}>
            {[...new Map(rows.map((r) => [r.platform.id, r.platform])).values()].map((p) => (
              <PlatformLogo key={p.id} id={p.id} name={p.name} size={30} />
            ))}
          </LogoStack>
        }
        tiles={
          <>
            <Tile category="borrow" label="Highest LTV" value={formatLtv(stats.maxLtv)} note="Before liquidation buffer" />
            <Tile
              label="Median borrow cost"
              value={stats.medianApr === null ? "—" : `${stats.medianApr.toFixed(2)}%`}
              note={cheapest ? `from ${cheapest.borrow!.borrowApr?.toFixed(2)}% on ${cheapest.platform.name}` : "Annual interest"}
            />
            <Tile label="Borrow markets" value={String(rows.length)} note={`${withLtv} with a published LTV`} />
            <Tile label="Loan assets" value={String(stats.loanAssets.length)} note={stats.loanAssets.join(", ")} />
          </>
        }
      >
        {/* Answer-first: the sentence a search engine or AI assistant should lift. */}
        <p>
          As of {asOf}: {rows.length} markets accept a tokenized stock as collateral, up to{" "}
          <strong className="text-fg">{formatLtv(stats.maxLtv)}</strong> loan-to-value
          {cheapest && (
            <>
              , with loans from <strong className="text-fg">{cheapest.borrow!.borrowApr?.toFixed(2)}%</strong> a year
            </>
          )}
          .
        </p>
      </CategoryHeader>

      <section className="mb-12">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            Every borrow market
            <InfoTip text="Max LTV is the liquidation line, not a target. Cost is the annual interest on the loan. The stock itself usually earns nothing while posted as collateral." />
          </h2>
          <p className="text-xs text-fg-subtle">
            Updated {asOf} ·{" "}
            <Link href="/methodology" className="underline hover:text-fg">
              methodology
            </Link>
          </p>
        </div>
        <BorrowTable rows={rows} />
      </section>

      <LearnMore
        posts={["borrowing-against-tokenized-stocks-risks"]}
        terms={["oracle-gap-risk", "collateral-only", "tokenized-stock"]}
      />

      <Faq entries={faq} />
    </>
  );
}
