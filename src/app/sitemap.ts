import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config";
import { stockPageTickers } from "@/lib/data/liquidity";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { listPosts } from "@/lib/content/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const dataModified = new Date(loadLatestSnapshot()?.fetchedAt ?? Date.now());

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: dataModified, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/stocks`, lastModified: dataModified, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/earn`, lastModified: dataModified, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/newsletter`, lastModified: dataModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/developers`, lastModified: dataModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: dataModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/liquidity`, lastModified: dataModified, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/opportunities`, lastModified: dataModified, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/borrow`, lastModified: dataModified, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/platforms`, lastModified: dataModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/issuers`, lastModified: dataModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/methodology`, lastModified: dataModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/glossary`, lastModified: dataModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/hub`, lastModified: dataModified, changeFrequency: "weekly", priority: 0.8 },
  ];

  const stockPages: MetadataRoute.Sitemap = [...stockPageTickers()].map((t) => t.toLowerCase()).map((ticker) => ({
    url: `${SITE_URL}/stock/${ticker}`,
    lastModified: dataModified,
    changeFrequency: "hourly" as const,
    priority: 0.9,
  }));

  const postPages: MetadataRoute.Sitemap = listPosts().map((post) => ({
    url: `${SITE_URL}/hub/${post.slug}`,
    lastModified: new Date(post.dateModified),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...stockPages, ...postPages];
}
