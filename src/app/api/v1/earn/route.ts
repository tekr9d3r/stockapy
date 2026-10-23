import type { NextRequest } from "next/server";
import { ENDPOINTS, filterEarn, parseQuery } from "@/lib/api/query";
import { apiError, apiJson } from "@/lib/api/respond";
import { opportunityItem } from "@/lib/api/serialize";
import { getRows } from "@/lib/data/rows";

/** Places that pay you to deposit a tokenized stock. */
export function GET(req: NextRequest) {
  const parsed = parseQuery(req.nextUrl.searchParams, ENDPOINTS.earn);
  if (!parsed.ok) return apiError(400, parsed.error);
  const items = filterEarn(getRows().map(opportunityItem), parsed.q);
  return apiJson({ query: parsed.q, count: items.length, items });
}
