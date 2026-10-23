import { NextResponse, type NextRequest } from "next/server";

/**
 * Markdown for agents, two ways:
 *   /earn.md, /stock/nvda.md, /index.md  ->  the Markdown mirror
 *   any page requested with Accept: text/markdown (and not text/html)  ->  same
 * Browsers always send text/html first, so they are never affected.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.endsWith(".md")) {
    const page = pathname.slice(0, -3).replace(/\/index$/, "") || "/";
    return NextResponse.rewrite(new URL(`/md${page === "/" ? "" : page}`, req.url));
  }
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/markdown") && !accept.includes("text/html")) {
    return NextResponse.rewrite(new URL(`/md${pathname === "/" ? "" : pathname}`, req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: never API routes, Next internals, files with other extensions, or /md itself.
  matcher: ["/((?!api|_next|md/|md$|.*\\.(?!md$)[a-z0-9]+$).*)"],
};
