import { apiError, apiJson } from "@/lib/api/respond";
import { liquidityItem, opportunityItem } from "@/lib/api/serialize";
import { liquidityRowsForTicker, stockPageTickers } from "@/lib/data/liquidity";
import { assetByTicker } from "@/lib/data/assets";
import { rowsForTicker } from "@/lib/data/rows";
import { SITE_URL } from "@/config";

export const revalidate = 3600;

export function generateStaticParams() {
  return [...stockPageTickers()].map((t) => ({ ticker: t.toLowerCase() }));
}

/** Everything for one stock: deposit venues, borrow markets and liquidity pools. */
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const asset = assetByTicker(ticker);
  if (!asset || !stockPageTickers().has(asset.ticker)) return apiError(404, `Unknown ticker "${ticker}". See /api/v1/stocks for the list.`);
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
