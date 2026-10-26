import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { GLOSSARY } from "@/lib/content/glossary";
import { glossaryLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Glossary of tokenized stock yield terms",
  description:
    "Plain-English definitions of tokenized stock and DeFi terms, each with its stock-market " +
    "equivalent: APY, LTV, liquidation, stablecoins, liquidity pools, base vs reward APY and more.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  return (
    <article className="max-w-3xl">
      <JsonLd data={glossaryLd()} />
      <h1 className="text-4xl tracking-tight">Glossary</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-fg-muted">
        The words you will meet on this site, each with the nearest thing you already know from
        the stock market.
      </p>

      <dl className="mt-8 divide-y">
        {GLOSSARY.map((entry) => (
          <div key={entry.slug} id={entry.slug} className="scroll-mt-20 py-5 first:pt-0">
            <dt className="text-lg font-semibold">{entry.term}</dt>
            <dd className="mt-1.5 leading-relaxed text-fg-muted">{entry.definition}</dd>
            {entry.tradfi && (
              <dd className="mt-2 border-l-2 border-fg pl-3 text-sm text-fg">
                <span className="kicker mr-1.5">In stock-market terms</span>
                {entry.tradfi}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </article>
  );
}
