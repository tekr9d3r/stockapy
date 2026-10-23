import { markdownFor } from "@/lib/api/pages-md";

export const revalidate = 3600;

/**
 * Markdown mirrors of the data pages. Reached as /earn.md, /stock/nvda.md, or by
 * requesting a page with `Accept: text/markdown` (see src/middleware.ts).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const md = markdownFor(path);
  if (md === null) {
    return new Response("# Not found\n\nNo Markdown version of this page. Try /index.md or /llms.txt.\n", {
      status: 404,
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  }
  return new Response(md, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=3600",
      "x-robots-tag": "noindex",
    },
  });
}
