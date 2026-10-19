import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { GLOSSARY } from "@/lib/content/glossary";
import { glossaryLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Glossary of tokenized stock yield terms",
  description:
    "Plain definitions of the terms that decide whether a tokenized stock yield is real: " +
    "base APY, reward APY, points, collateral-only venues, looped vaults and oracle gap risk.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  return (
    <article className="max-w-3xl">
      <JsonLd data={glossaryLd()} />
      <h1 className="text-3xl font-semibold tracking-tight">Glossary</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-fg-muted">
        Nine terms that decide whether a quoted rate on a tokenized stock means anything.
      </p>

      <dl className="mt-8 divide-y">
        {GLOSSARY.map((entry) => (
          <div key={entry.slug} id={entry.slug} className="scroll-mt-20 py-5 first:pt-0">
            <dt className="text-lg font-semibold">{entry.term}</dt>
            <dd className="mt-1.5 leading-relaxed text-fg-muted">{entry.definition}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
