import type { NextRequest } from "next/server";
import { ENDPOINTS, filterLiquidity, parseQuery } from "@/lib/api/query";
import { apiError, apiJson } from "@/lib/api/respond";
import { liquidityItem } from "@/lib/api/serialize";
import { getLiquidityRows } from "@/lib/data/liquidity";

/** Active DEX pools that pair a tokenized stock. */
export function GET(req: NextRequest) {
  const parsed = parseQuery(req.nextUrl.searchParams, ENDPOINTS.liquidity);
  if (!parsed.ok) return apiError(400, parsed.error);
  const items = filterLiquidity(getLiquidityRows().map(liquidityItem), parsed.q);
  return apiJson({ query: parsed.q, count: items.length, items });
}
