import type { Metadata } from "next";
import Link from "next/link";
import { listPosts } from "@/lib/content/posts";
import { formatDate } from "@/lib/format";
import { BRAND_NAME } from "@/config";

export const metadata: Metadata = {
  title: "Hub",
  description:
    "Research and explainers on tokenized stock yield: where the rates come from, which " +
    "ones are real, and what changes month to month.",
  alternates: { canonical: "/hub" },
};

export default function HubPage() {
  const posts = listPosts();

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Hub</h1>
      <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-fg-muted">
        Working notes from building {BRAND_NAME}: what the data says about tokenized stock
        yield, where the numbers come from, and what we got wrong.
      </p>

      {posts.length === 0 ? (
        <p className="mt-8 rounded-lg border bg-bg-subtle p-6 text-sm text-fg-muted">
          No posts yet. Drop an <code className="rounded bg-bg px-1">.mdx</code> file in{" "}
          <code className="rounded bg-bg px-1">content/hub/</code> and it appears here.
        </p>
      ) : (
        <ul className="mt-8 divide-y">
          {posts.map((post) => (
            <li key={post.slug} className="py-5 first:pt-0">
              <h2 className="text-lg font-semibold">
                <Link href={`/hub/${post.slug}`} className="hover:text-accent hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{post.description}</p>
              <p className="mt-2 text-xs text-fg-subtle">
                <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time>
                {post.tags.length > 0 && <> · {post.tags.join(", ")}</>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
