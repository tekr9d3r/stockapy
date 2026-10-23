import Link from "next/link";
import { ArrowRight, BookOpen, Hash } from "lucide-react";
import { GLOSSARY } from "@/lib/content/glossary";
import { getPost } from "@/lib/content/posts";

/**
 * Where a page's explanations live now: a strip of links to Knowledge Hub
 * articles and glossary terms, instead of paragraphs on the page itself.
 */
export function LearnMore({ posts, terms = [] }: { posts: string[]; terms?: string[] }) {
  const articles = posts.flatMap((slug) => {
    const p = getPost(slug);
    if (!p) return [];
    const minutes = Math.max(1, Math.round(p.body.split(/\s+/).length / 220));
    return [{ href: `/hub/${slug}`, title: p.title, meta: `${minutes} min read` }];
  });
  const defs = terms.flatMap((slug) => {
    const t = GLOSSARY.find((g) => g.slug === slug);
    return t ? [{ href: `/glossary#${slug}`, title: t.term }] : [];
  });

  return (
    <section aria-labelledby="learn-more" className="mt-12">
      <h2 id="learn-more" className="mb-3 text-sm font-semibold tracking-wide text-fg-muted uppercase">
        Before you deposit
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {articles.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-3 rounded-xl border bg-bg-raised p-4 transition hover:border-border-strong hover:shadow-card"
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-hub-subtle text-hub">
              <BookOpen size={17} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium leading-snug group-hover:text-accent">{a.title}</span>
              <span className="text-xs text-fg-subtle">{a.meta}</span>
            </span>
            <ArrowRight size={16} aria-hidden="true" className="text-fg-subtle" />
          </Link>
        ))}
      </div>
      {defs.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-fg-subtle">Terms:</span>
          {defs.map((d) => (
            <Link key={d.href} href={d.href} className="inline-flex items-center gap-1 rounded-full border bg-bg-raised px-2.5 py-0.5 text-fg-muted hover:text-fg">
              <Hash size={12} aria-hidden="true" />
              {d.title}
            </Link>
          ))}
        </p>
      )}
    </section>
  );
}
