import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content", "hub");

const NO_JS = (): never => {
  throw new Error("JavaScript front matter is disabled");
};

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  author: string;
  tags: string[];
  /** Questions this post answers, rendered as an FAQ block and as FAQPage JSON-LD. */
  faq?: { question: string; answer: string }[];
};

export type Post = PostMeta & { body: string };

function parseFile(fileName: string): Post {
  const slug = fileName.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(path.join(POSTS_DIR, fileName), "utf8");
  // Front matter is YAML only. gray-matter can also evaluate "---js" blocks;
  // that is switched off so a file can never run code just by being parsed.
  const { data, content } = matter(raw, { engines: { js: NO_JS, javascript: NO_JS } });

  const required = ["title", "description", "datePublished", "author"] as const;
  for (const key of required) {
    if (!data[key]) throw new Error(`content/hub/${fileName} is missing frontmatter: ${key}`);
  }

  return {
    slug,
    title: data.title,
    description: data.description,
    datePublished: String(data.datePublished),
    dateModified: String(data.dateModified ?? data.datePublished),
    author: data.author,
    tags: data.tags ?? [],
    faq: data.faq,
    body: content,
  };
}

export function listPosts(): PostMeta[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));
  } catch {
    return [];
  }
  return files
    .map(parseFile)
    .sort((a, b) => Date.parse(b.datePublished) - Date.parse(a.datePublished));
}

/** Post slugs are lower-case words and hyphens. Anything else (dots, slashes) is refused. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function getPost(slug: string): Post | null {
  // The slug comes from the URL (e.g. /hub/<slug>.md): never let it leave POSTS_DIR.
  if (!SLUG.test(slug)) return null;
  for (const ext of [".mdx", ".md"]) {
    const file = `${slug}${ext}`;
    if (fs.existsSync(path.join(POSTS_DIR, file))) return parseFile(file);
  }
  return null;
}
