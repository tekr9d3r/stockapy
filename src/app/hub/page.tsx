import type { Metadata } from "next";
import Link from "next/link";
import { CategoryBadgeIcon } from "@/components/CategoryIcon";
import { listPosts } from "@/lib/content/posts";
import { formatDate } from "@/lib/format";
import { BRAND_NAME } from "@/config";

export const metadata: Metadata = {
  title: "Knowledge Hub",
  description:
    "Research and explainers on tokenized stock yield: where the rates come from, which " +
    "ones are real, and what changes month to month.",
  alternates: { canonical: "/hub" },
};

export default function HubPage() {
  const posts = listPosts();

  return (
    <>
      <div className="flex items-center gap-3">
        <CategoryBadgeIcon category="hub" size={44} />
        <p className="text-xs font-semibold tracking-widest text-hub uppercase">Research and explainers</p>
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Knowledge Hub</h1>
      <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-fg-muted">
        Working notes from building {BRAND_NAME}: what the data says about tokenized stock
        yield, where the numbers come from, and what we got wrong.
      </p>

      {posts.length === 0 ? (
        <p className="mt-8 rounded-lg border bg-bg-subtle p-6 text-sm text-fg-muted">
          No posts yet. Drop an <code className="rounded bg-bg px-1">.mdx</code> file in{" "}
          <code className="rounded bg-bg px-1">content/hub/</code> and it appears here.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/hub/${post.slug}`}
                className="group flex h-full flex-col rounded-xl border bg-bg-raised p-5 transition hover:border-border-strong hover:shadow-card"
              >
                <h2 className="text-lg font-semibold leading-snug group-hover:text-accent">{post.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{post.description}</p>
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                  {post.tags.map((t) => (
                    <span key={t} className="rounded-full bg-hub-subtle px-2 py-0.5 text-[11px] font-medium text-hub">
                      {t}
                    </span>
                  ))}
                  <time dateTime={post.datePublished} className="ml-auto text-xs text-fg-subtle">
                    {formatDate(post.datePublished)}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
