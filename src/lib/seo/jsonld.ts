import { BRAND_NAME, SITE_DESCRIPTION, SITE_URL, SOCIAL } from "@/config";
import { GLOSSARY } from "@/lib/content/glossary";
import { formatApy, formatPp } from "@/lib/format";
import type { Row, UnderlyingAsset } from "@/lib/data/types";

type Json = Record<string, unknown>;

const PUBLISHER = {
  "@type": "Organization",
  name: BRAND_NAME,
  url: SITE_URL,
};

export function organizationLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    sameAs: [SOCIAL.x, SOCIAL.github],
  };
}

export function webSiteLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: PUBLISHER,
  };
}

/**
 * Dataset is the schema that actually fits a yield comparison table, and it feeds
 * Google Dataset Search as well as general extraction.
 */
export function datasetLd({
  name,
  description,
  url,
  modified,
  variables,
}: {
  name: string;
  description: string;
  url: string;
  modified: string | null;
  variables: string[];
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url: `${SITE_URL}${url}`,
    creator: PUBLISHER,
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
    ...(modified ? { dateModified: modified } : {}),
    variableMeasured: variables,
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${SITE_URL}/api/opportunities`,
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${SITE_URL}/api/opportunities.csv`,
      },
    ],
  };
}

/** The comparison rows themselves, so an extractor does not have to parse the table. */
export function itemListLd(rows: Row[], name: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 50).map((row, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "FinancialProduct",
        name: `${row.token.symbol} on ${row.platform.name}${row.variant ? ` (${row.variant})` : ""}`,
        url: row.url,
        provider: { "@type": "Organization", name: row.platform.name, url: row.platform.website },
        ...(row.apyTotal !== null
          ? {
              interestRate: {
                "@type": "QuantitativeValue",
                value: row.apyTotal,
                unitText: "PERCENT",
              },
            }
          : {}),
        description:
          row.apyTotal === null
            ? `Rate not collected yet. ${row.category === "collateral" ? "Collateral only." : ""}`.trim()
            : `${formatApy(row.apyTotal)} total: ${formatPp(row.apyBase)}pp interest, ` +
              `${formatPp(row.apyReward)}pp token incentives, on ${row.chain}.`,
      },
    })),
  };
}

export function breadcrumbLd(trail: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

export function faqLd(entries: { question: string; answer: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export function glossaryLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: `${BRAND_NAME} glossary`,
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: GLOSSARY.map((entry) => ({
      "@type": "DefinedTerm",
      name: entry.term,
      description: entry.definition,
      url: `${SITE_URL}/glossary#${entry.slug}`,
    })),
  };
}

export function articleLd({
  title,
  description,
  slug,
  published,
  modified,
  author,
}: {
  title: string;
  description: string;
  slug: string;
  published: string;
  modified: string;
  author: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: `${SITE_URL}/hub/${slug}`,
    mainEntityOfPage: `${SITE_URL}/hub/${slug}`,
    datePublished: published,
    dateModified: modified,
    author: { "@type": "Person", name: author },
    publisher: PUBLISHER,
  };
}

/**
 * Builds the questions a stock page answers, from live data. Written as real
 * sentences because these are what an answer engine quotes.
 */
export function stockFaq(asset: UnderlyingAsset, rows: Row[]) {
  const earn = rows.filter((r) => r.category === "earn" && !r.unmeasured);
  const best = earn.length
    ? earn.reduce((a, b) => ((b.apyTotal ?? 0) > (a.apyTotal ?? 0) ? b : a))
    : null;
  const collateralOnly = rows.filter((r) => r.category === "collateral");

  const faq = [
    {
      question: `Can you earn yield on tokenized ${asset.ticker}?`,
      answer: best
        ? `Yes, but very little of it is interest. The highest rate we track is ` +
          `${formatApy(best.apyTotal)} on ${best.platform.name} for ${best.token.symbol} on ` +
          `${best.chain}, and ${formatPp(best.apyReward)} of those ${formatPp(best.apyTotal)} ` +
          `percentage points are token incentives rather than interest paid by borrowers.`
        : `Not at the moment. Every venue we track that accepts a tokenized ${asset.ticker} ` +
          `holds it as collateral only, which means it earns nothing while deposited.`,
    },
    {
      question: `Which tokenized ${asset.ticker} tokens exist?`,
      answer:
        `We track ${new Set(rows.map((r) => r.token.symbol)).size} tokenized ${asset.ticker} ` +
        `tokens: ${[...new Set(rows.map((r) => `${r.token.symbol} from ${r.issuer.name} on ${r.chain}`))].join("; ")}. ` +
        `They are not interchangeable — each issuer has its own redemption rules and its own venues.`,
    },
  ];

  const borrowable = rows.filter((r) => r.borrow && r.borrow.ltv !== null);
  if (borrowable.length > 0) {
    const best = borrowable.reduce((a, b) => ((b.borrow!.ltv ?? 0) > (a.borrow!.ltv ?? 0) ? b : a));
    const cheap = borrowable
      .filter((r) => r.borrow!.borrowApr !== null)
      .sort((a, b) => a.borrow!.borrowApr! - b.borrow!.borrowApr!)[0];
    faq.push({
      question: `Can you borrow against tokenized ${asset.ticker}?`,
      answer:
        `Yes. ${borrowable.length} of the venues we track accept a tokenized ${asset.ticker} ` +
        `as collateral. The highest loan-to-value is ${Math.round((best.borrow!.ltv ?? 0) * 100)}% ` +
        `on ${best.platform.name}` +
        (cheap
          ? `, and the cheapest loan costs ${cheap.borrow!.borrowApr!.toFixed(2)}% a year ` +
            `borrowing ${cheap.borrow!.loanAsset} on ${cheap.platform.name}`
          : "") +
        `. Borrowing against a tokenized share adds a liquidation price that holding the ` +
        `share itself does not have, and the oracle keeps quoting a price while the stock ` +
        `exchange is shut.`,
    });
  }

  if (collateralOnly.length > 0) {
    faq.push({
      question: `Why do some ${asset.ticker} venues show 0%?`,
      answer:
        `${collateralOnly.length} of the venues we track accept tokenized ${asset.ticker} as ` +
        `collateral but never lend it out, so the deposit earns nothing by design. The 0% is a ` +
        `correct measurement, not a missing one. Those positions only unlock borrowing power, ` +
        `and borrowing against them carries liquidation risk.`,
    });
  }

  return faq;
}
