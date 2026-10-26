import Link from "next/link";
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
    <section aria-labelledby="learn-more" className="mt-12 border-t-2 border-fg pt-4">
      <h2 id="learn-more" className="text-2xl tracking-tight">
        Before you deposit
      </h2>
      <ul className="mt-2 divide-y">
        {articles.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="group flex items-baseline justify-between gap-4 py-3">
              <span className="font-[family-name:var(--font-display)] text-lg leading-snug group-hover:underline">{a.title}</span>
              <span className="shrink-0 text-xs text-fg-subtle">{a.meta}</span>
            </Link>
          </li>
        ))}
      </ul>
      {defs.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="text-fg-subtle">Terms used here: </span>
          {defs.map((d, i) => (
            <span key={d.href}>
              {i > 0 && <span className="text-fg-subtle"> · </span>}
              <Link href={d.href} className="text-accent underline-offset-2 hover:underline">
                {d.title}
              </Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
