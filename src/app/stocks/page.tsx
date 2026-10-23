import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { StockTile } from "@/components/StockTile";
import { getHomeData } from "@/lib/data/home";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { formatDate } from "@/lib/format";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { BRAND_NAME, SITE_URL } from "@/config";

export const revalidate = 3600;

const DESCRIPTION =
  "Every tokenized stock and fund with a live market — deposit, liquidity or borrowing — with the best " +
  "rate for each. xStocks, Ondo, Coinbase, Robinhood and Binance tokens, updated hourly.";

export const metadata: Metadata = {
  title: "Every tokenized stock with a live market",
  description: DESCRIPTION,
  alternates: { canonical: "/stocks", types: { "application/json": "/api/v1/stocks" } },
};

export default function StocksPage() {
  const d = getHomeData();
  const asOf = formatDate(loadLatestSnapshot()?.fetchedAt ?? null);
  const funds = d.stocks.filter((s) => s.type === "etf");
  const shares = d.stocks.filter((s) => s.type !== "etf");

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Tokenized stocks with a live market",
            numberOfItems: d.stocks.length,
            itemListElement: d.stocks.map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `Tokenized ${s.ticker} (${s.name})`,
              url: `${SITE_URL}/stock/${s.ticker.toLowerCase()}`,
            })),
          },
          breadcrumbLd([
            { name: BRAND_NAME, path: "/" },
            { name: "Stocks", path: "/stocks" },
          ]),
        ]}
      />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Every tokenized stock with a live market</h1>
      {/* Answer-first. */}
      <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-fg-muted">
        As of {asOf}: {shares.length} stocks and {funds.length} funds have at least one market where a token can
        earn — a deposit venue, an active liquidity pool or a borrow market. Most active first.
      </p>

      <Group title="Stocks" items={shares} />
      {funds.length > 0 && <Group title="ETFs and commodity funds" items={funds} />}
    </>
  );
}

function Group({ title, items }: { title: string; items: ReturnType<typeof getHomeData>["stocks"] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-fg-muted uppercase">
        {title} · {items.length}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((s) => (
          <StockTile key={s.ticker} s={s} />
        ))}
      </div>
    </section>
  );
}
