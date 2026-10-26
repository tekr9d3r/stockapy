import type { Metadata } from "next";
import Link from "next/link";
import { listLessons, listPosts } from "@/lib/content/posts";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Knowledge Hub: tokenized stocks explained",
  description:
    "A short course on tokenized stocks for stock investors: what they are, where the yield " +
    "comes from, how to buy one, the risks compared with a broker, and how lending, market " +
    "making and borrowing work. Plus research on tokenized stock yield.",
  alternates: { canonical: "/hub" },
};

export default function HubPage() {
  const lessons = listLessons();
  const analysis = listPosts().filter((p) => p.track !== "start");

  return (
    <>
      <h1 className="max-w-3xl text-4xl tracking-tight sm:text-5xl">Tokenized stocks, explained for stock investors</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-fg-muted">
        You know shares, brokers and dividends. These {lessons.length} short lessons cover what changes when a
        share becomes a token, and what it lets you do. Read them in order, or jump to the one you need.
      </p>

      <section aria-labelledby="start-here" className="mt-10 border-t-2 border-fg pt-4">
        <h2 id="start-here" className="text-2xl tracking-tight">Start here: {lessons.length} lessons</h2>
        <ol className="mt-2 divide-y">
          {lessons.map((p, i) => (
            <li key={p.slug}>
              <Link href={`/hub/${p.slug}`} className="group grid grid-cols-[2.5rem_1fr] gap-x-2 py-4 sm:grid-cols-[3rem_1fr]">
                <span className="font-[family-name:var(--font-display)] text-2xl text-fg-subtle tabular-nums">{i + 1}</span>
                <span>
                  <span className="block font-[family-name:var(--font-display)] text-xl leading-snug group-hover:underline">
                    {p.lessonTitle ?? p.title}
                  </span>
                  <span className="mt-1 block max-w-2xl text-sm leading-relaxed text-fg-muted">{p.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {analysis.length > 0 && (
        <section aria-labelledby="analysis" className="mt-12 border-t-2 border-fg pt-4">
          <h2 id="analysis" className="text-2xl tracking-tight">Analysis and research</h2>
          <ul className="mt-2 divide-y">
            {analysis.map((p) => (
              <li key={p.slug}>
                <Link href={`/hub/${p.slug}`} className="group block py-4">
                  <span className="block font-[family-name:var(--font-display)] text-xl leading-snug group-hover:underline">{p.title}</span>
                  <span className="mt-1 block max-w-2xl text-sm leading-relaxed text-fg-muted">{p.description}</span>
                  <time dateTime={p.datePublished} className="mt-1.5 block text-xs text-fg-subtle">
                    {formatDate(p.datePublished)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-sm text-fg-muted">
        Unfamiliar word? The{" "}
        <Link href="/glossary" className="text-accent underline underline-offset-2">glossary</Link>{" "}
        gives each term with its stock-market equivalent.
      </p>
    </>
  );
}
