import { apiError, apiJson } from "@/lib/api/respond";
import { liquidityItem, opportunityItem } from "@/lib/api/serialize";
import { liquidityRowsForTicker } from "@/lib/data/liquidity";
import { rowsForTicker } from "@/lib/data/rows";
import { loadSeed } from "@/lib/data/seed";
import { SITE_URL } from "@/config";

export const revalidate = 3600;

export function generateStaticParams() {
  return loadSeed().underlying_assets.map((a) => ({ ticker: a.ticker.toLowerCase() }));
}

/** Everything for one stock: deposit venues, borrow markets and liquidity pools. */
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const asset = loadSeed().underlying_assets.find((a) => a.ticker.toLowerCase() === ticker.toLowerCase());
  if (!asset) return apiError(404, `Unknown ticker "${ticker}". See /api/v1/stocks for the list.`);
  const rows = rowsForTicker(asset.ticker).map(opportunityItem);
  return apiJson({
    ticker: asset.ticker,
    name: asset.name,
    page: `${SITE_URL}/stock/${asset.ticker.toLowerCase()}`,
    earn: rows.filter((r) => r.category === "earn"),
    borrow: rows.filter((r) => r.borrow !== null && r.status === "live"),
    liquidity: liquidityRowsForTicker(asset.ticker).map(liquidityItem),
  });
}
