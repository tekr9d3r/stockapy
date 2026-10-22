"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ActionButton } from "./ActionButton";
import { Badge } from "./Badge";
import { PlatformLogo } from "./Logo";
import { StockLogo } from "./StockLogo";
import { formatApy, formatLtv, formatRelativeShort, SOURCE_LABEL, formatDate } from "@/lib/format";
import type { Row } from "@/lib/data/types";

type SortKey = "ltv" | "rate" | "stock";

/**
 * The borrow side: what you can raise against a tokenized stock and what it
 * costs. Rendered server-side in full; the controls only filter what is shown.
 */
export function BorrowTable({ rows, compact = false }: { rows: Row[]; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [asset, setAsset] = useState("all");
  const [sort, setSort] = useState<SortKey>("ltv");

  const assets = useMemo(
    () => [...new Set(rows.map((r) => r.borrow!.loanAsset))].sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (asset !== "all" && row.borrow!.loanAsset !== asset) return false;
      if (!q) return true;
      return [row.underlying.ticker, row.token.symbol, row.platform.name, row.chain]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "stock") return a.underlying.ticker.localeCompare(b.underlying.ticker);
      if (sort === "rate") {
        return (a.borrow!.borrowApr ?? Infinity) - (b.borrow!.borrowApr ?? Infinity);
      }
      return (b.borrow!.ltv ?? -1) - (a.borrow!.ltv ?? -1);
    });
  }, [rows, query, asset, sort]);

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search NVDA, Kamino, Morpho…"
            aria-label="Search borrow markets"
            className="h-9 min-w-[200px] flex-1 rounded-md border bg-bg-raised px-3 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
          />
          <select
            aria-label="Loan asset"
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="h-9 rounded-md border bg-bg-raised px-2 text-sm outline-none focus:border-accent"
          >
            <option value="all">Any loan asset</option>
            {assets.map((a) => (
              <option key={a} value={a}>
                Borrow {a}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-md border bg-bg-raised px-2 text-sm outline-none focus:border-accent"
          >
            <option value="ltv">Sort: Max LTV</option>
            <option value="rate">Sort: Cheapest</option>
            <option value="stock">Sort: Stock</option>
          </select>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-bg-raised">
        <table className="w-full min-w-[1140px] border-collapse text-sm">
          <caption className="sr-only">
            Tokenized stocks accepted as collateral, with the maximum loan-to-value and the
            cost of borrowing against them.
          </caption>
          <thead>
            <tr className="border-b bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-muted">
              <th scope="col" className="px-2 py-2 pl-4 font-medium">Stock</th>
              <th scope="col" className="px-2 py-2 font-medium">Token</th>
              <th scope="col" className="px-2 py-2 font-medium">Platform</th>
              <th scope="col" className="px-2 py-2 font-medium">Chain</th>
              <th scope="col" className="px-2 py-2 text-right font-medium" title="The most you can borrow against $100 of this stock.">
                Max LTV
              </th>
              <th scope="col" className="px-2 py-2 font-medium">Borrow</th>
              <th scope="col" className="px-2 py-2 text-right font-medium" title="Annual interest you pay on the loan.">
                Cost
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium" title="What the stock itself earns while posted as collateral.">
                Stock earns
              </th>
              <th
                scope="col"
                className="px-2 py-2 text-right font-medium"
                title="The other side of the market: what you earn by supplying the loan asset here, instead of the stock."
              >
                Lend side
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Updated</th>
              <th scope="col" className="px-2 py-2 pr-4 text-right font-medium">
                <span className="sr-only">Open market</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const { ltv, borrowApr, loanAsset } = row.borrow!;
              return (
                <tr key={row.id} className="border-b last:border-0 hover:bg-bg-subtle">
                  <td className="px-2 py-2.5 pl-4">
                    <Link
                      href={`/stock/${row.underlying.ticker.toLowerCase()}`}
                      className="flex items-center gap-2 font-medium hover:text-accent hover:underline"
                    >
                      <StockLogo ticker={row.underlying.ticker} name={row.underlying.name} />
                      {row.underlying.ticker}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <div className="font-medium">{row.token.symbol}</div>
                    <div className="text-xs text-fg-subtle">{row.issuer.name}</div>
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <PlatformLogo id={row.platform.id} name={row.platform.name} size={20} />
                      <span className="font-medium">{row.platform.name}</span>
                      <Badge tone={row.platform.kind === "cefi" ? "accent" : "neutral"}>
                        {row.platform.kind === "cefi" ? "CeFi" : "DeFi"}
                      </Badge>
                      {!row.listed && (
                        <Badge
                          tone="warn"
                          title="Not listed in the venue's own interface: reachable only by direct link, and not curated by them."
                        >
                          Unlisted
                        </Badge>
                      )}
                    </div>
                    {row.variant && (
                      <div className="mt-0.5 text-xs text-fg-subtle">{row.variant}</div>
                    )}
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap text-fg-muted">{row.chain}</td>
                  <td className="tnum px-2 py-2.5 text-right whitespace-nowrap">
                    {ltv === null ? (
                      <span className="text-fg-subtle">not collected</span>
                    ) : (
                      <span className="font-semibold">{formatLtv(ltv)}</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap font-medium">{loanAsset}</td>
                  <td className="tnum px-2 py-2.5 text-right whitespace-nowrap">
                    {borrowApr === null ? (
                      <span className="text-fg-subtle">—</span>
                    ) : (
                      <span className={borrowApr > 8 ? "text-warn" : "text-fg"}>
                        {borrowApr.toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="tnum px-2 py-2.5 text-right whitespace-nowrap text-fg-muted">
                    {row.unmeasured ? "—" : formatApy(row.apyTotal)}
                    {row.pointsLabel && (
                      <span
                        className="ml-1 text-[10px] font-medium uppercase tracking-wide text-accent"
                        title={`Also earns ${row.pointsLabel}. Points have no stated rate, value or date, so they are not part of the APY.`}
                      >
                        + {row.pointsLabel}
                      </span>
                    )}
                  </td>
                  <td className="tnum px-2 py-2.5 text-right whitespace-nowrap">
                    {row.borrow!.lendApy === null ? (
                      <span className="text-fg-subtle">—</span>
                    ) : (
                      <span
                        className={row.borrow!.lendApy > 10 ? "text-warn" : "text-positive"}
                        title={`Supply ${loanAsset} into this market to earn ${row.borrow!.lendApy.toFixed(2)}%. This is yield on ${loanAsset}, not on your stock.`}
                      >
                        {row.borrow!.lendApy.toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right text-xs whitespace-nowrap text-fg-subtle">
                    <span
                      title={`Collected ${formatDate(row.fetchedAt)} from ${
                        SOURCE_LABEL[row.source] ?? row.source
                      }`}
                    >
                      {formatRelativeShort(row.fetchedAt)}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 pr-4 text-right">
                    <ActionButton
                      href={row.deepLink}
                      platform={row.platform.name}
                      category="borrow"
                      specific={row.deepLinkIsSpecific}
                    />
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-fg-muted">
                  Nothing matches those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-fg-subtle">
        Showing {visible.length} of {rows.length} borrow markets. Max LTV is the most you can
        draw against $100 of the stock; you will be liquidated well before reaching it.
        &ldquo;Lend side&rdquo; is what a lender earns supplying the loan asset into the same
        market — yield on that stablecoin, not on your shares.
      </p>
    </div>
  );
}
