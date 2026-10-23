import type { NextRequest } from "next/server";
import { ENDPOINTS, filterBorrow, parseQuery } from "@/lib/api/query";
import { apiError, apiJson } from "@/lib/api/respond";
import { opportunityItem } from "@/lib/api/serialize";
import { getRows } from "@/lib/data/rows";

/** Markets that accept a tokenized stock as collateral. */
export function GET(req: NextRequest) {
  const parsed = parseQuery(req.nextUrl.searchParams, ENDPOINTS.borrow);
  if (!parsed.ok) return apiError(400, parsed.error);
  const items = filterBorrow(getRows().map(opportunityItem), parsed.q);
  return apiJson({ query: parsed.q, count: items.length, items });
}
