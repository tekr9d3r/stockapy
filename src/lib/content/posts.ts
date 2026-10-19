import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content", "hub");

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
  const { data, content } = matter(raw);

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

export function getPost(slug: string): Post | null {
  for (const ext of [".mdx", ".md"]) {
    const file = `${slug}${ext}`;
    if (fs.existsSync(path.join(POSTS_DIR, file))) return parseFile(file);
  }
  return null;
}
