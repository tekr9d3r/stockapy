import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { JsonLd } from "@/components/JsonLd";
import { mdxComponents } from "@/components/mdx";
import { getPost, listLessons, listPosts } from "@/lib/content/posts";
import { articleLd, breadcrumbLd, faqLd } from "@/lib/seo/jsonld";
import { formatDate } from "@/lib/format";
import { BRAND_NAME } from "@/config";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return listPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/hub/${post.slug}` },
    openGraph: {
      title: `${post.title} · ${BRAND_NAME}`,
      description: post.description,
      type: "article",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      authors: [post.author],
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const lessons = listLessons();
  const at = lessons.findIndex((l) => l.slug === post.slug);
  const prev = at > 0 ? lessons[at - 1] : null;
  const next = at >= 0 && at < lessons.length - 1 ? lessons[at + 1] : null;

  return (
    <article className="max-w-3xl">
      <JsonLd
        data={[
          articleLd({
            title: post.title,
            description: post.description,
            slug: post.slug,
            published: post.datePublished,
            modified: post.dateModified,
            author: post.author,
          }),
          breadcrumbLd([
            { name: BRAND_NAME, path: "/" },
            { name: "Knowledge Hub", path: "/hub" },
            { name: post.title, path: `/hub/${post.slug}` },
          ]),
          ...(post.faq?.length ? [faqLd(post.faq)] : []),
        ]}
      />

      <nav className="mb-4 text-xs text-fg-subtle">
        <Link href="/hub" className="hover:text-fg">
          Knowledge Hub
        </Link>
        <span className="mx-1.5">/</span>
        <span>{at >= 0 ? `Lesson ${at + 1} of ${lessons.length}` : "Analysis"}</span>
      </nav>

      {at >= 0 && <p className="kicker">Start here · lesson {at + 1} of {lessons.length}</p>}
      <h1 className="mt-2 text-4xl leading-tight tracking-tight">{post.title}</h1>
      <p className="mt-2 text-sm text-fg-subtle">
        <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time>
        {post.dateModified !== post.datePublished && (
          <> · updated <time dateTime={post.dateModified}>{formatDate(post.dateModified)}</time></>
        )}
        {" · "}
        {post.author}
      </p>
      <p className="mt-4 font-[family-name:var(--font-display)] text-xl leading-relaxed text-fg-muted">{post.description}</p>

      <div className="mt-6">
        <MDXRemote
          source={post.body}
          components={mdxComponents}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
      </div>

      {at >= 0 && (
        <nav aria-label="Lessons" className="mt-12 grid gap-4 border-t-2 border-fg pt-4 sm:grid-cols-2">
          {prev ? (
            <Link href={`/hub/${prev.slug}`} className="group">
              <span className="kicker">← Lesson {at}</span>
              <span className="mt-1 block font-[family-name:var(--font-display)] text-lg group-hover:underline">{prev.lessonTitle ?? prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/hub/${next.slug}`} className="group sm:text-right">
              <span className="kicker">Lesson {at + 2} →</span>
              <span className="mt-1 block font-[family-name:var(--font-display)] text-lg group-hover:underline">{next.lessonTitle ?? next.title}</span>
            </Link>
          ) : (
            <Link href="/" className="group sm:text-right">
              <span className="kicker">Course complete →</span>
              <span className="mt-1 block font-[family-name:var(--font-display)] text-lg group-hover:underline">See today&apos;s best opportunities</span>
            </Link>
          )}
        </nav>
      )}

      {post.faq && post.faq.length > 0 && (
        <section className="mt-12 border-t pt-8">
          <h2 className="mb-4 text-xl font-semibold">Questions</h2>
          <dl className="space-y-5">
            {post.faq.map((entry) => (
              <div key={entry.question}>
                <dt className="font-medium">{entry.question}</dt>
                <dd className="mt-1 leading-relaxed text-fg-muted">{entry.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </article>
  );
}
