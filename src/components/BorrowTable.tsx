"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ActionButton } from "./ActionButton";
import { Badge } from "./Badge";
import { ChainLogo, PlatformLogo } from "./Logo";
import { MiniBar } from "./MiniBar";
import { StockLogo } from "./StockLogo";
import { formatApy, formatLtv, formatRelativeShort, SOURCE_LABEL } from "@/lib/format";
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
  // Long lists start short. Hidden rows stay in the HTML, so crawlers still read every market.
  const [showAll, setShowAll] = useState(false);
  const PREVIEW = 12;

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
            <option value="ltv">Sort: borrow up to</option>
            <option value="rate">Sort: Cheapest</option>
            <option value="stock">Sort: Stock</option>
          </select>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-bg-raised md:overflow-x-auto">
        <table className="block w-full border-collapse text-sm md:table md:min-w-[760px]">
          <caption className="sr-only">
            Tokenized stocks accepted as collateral, with the maximum loan-to-value and the
            cost of borrowing against them.
          </caption>
          <thead className="hidden md:table-header-group">
            <tr className="border-y border-t-fg text-left text-[11px] text-fg-muted">
              <th scope="col" className="px-2 py-2 pl-4 font-medium">Stock</th>
              <th scope="col" className="px-2 py-2 font-medium">Platform</th>
              <th scope="col" className="px-2 py-2 font-medium">Chain</th>
              <th scope="col" className="px-2 py-2 text-right font-medium" title="The most you can borrow against $100 of this stock. You are liquidated well before reaching it.">
                Borrow up to
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium" title="What you borrow and its annual interest.">
                Borrow
              </th>
              <th scope="col" className="px-2 py-2 pr-4 text-right font-medium">
                <span className="sr-only">Open market</span>
              </th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {visible.map((row, index) => {
              const { ltv, borrowApr, loanAsset, lendApy } = row.borrow!;
              const folded = !compact && !showAll && index >= PREVIEW;
              const extra = [
                `Stock earns ${row.unmeasured ? "—" : formatApy(row.apyTotal)}${row.pointsLabel ? ` + ${row.pointsLabel}` : ""}`,
                lendApy !== null ? `lenders of ${loanAsset} earn ${lendApy.toFixed(2)}% (not yield on your stock)` : null,
                `updated ${formatRelativeShort(row.fetchedAt)} ago from ${SOURCE_LABEL[row.source] ?? row.source}`,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <tr key={row.id} className={`${folded ? "hidden" : "grid md:table-row"} grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 border-b px-4 py-3 last:border-0 hover:bg-bg-subtle md:p-0`}>
                  <td className="md:px-2 md:py-2.5 md:pl-4">
                    <Link href={`/stock/${row.underlying.ticker.toLowerCase()}`} className="flex items-center gap-2.5 hover:text-accent">
                      <StockLogo ticker={row.underlying.ticker} name={row.underlying.name} size={28} />
                      <span>
                        <span className="block font-semibold leading-tight">{row.underlying.ticker}</span>
                        <span className="block text-xs text-fg-subtle">
                          {row.token.symbol} · {row.issuer.name.replace(/ \(.*\)$/, "")}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="col-start-1 row-start-2 md:px-2 md:py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PlatformLogo id={row.platform.id} name={row.platform.name} size={20} />
                      <span className="font-medium">{row.platform.name}</span>
                      <span className="flex items-center gap-1 text-xs text-fg-subtle md:hidden">
                        · <ChainLogo chain={row.chain} size={12} /> {row.chain}
                      </span>
                      {!row.listed && (
                        <Badge tone="warn" title="Not listed in the venue's own interface: reachable only by direct link, and not curated by them.">
                          Unlisted
                        </Badge>
                      )}
                    </div>
                    {row.variant && <div className="mt-0.5 hidden text-xs text-fg-subtle md:block">{row.variant}</div>}
                  </td>
                  <td className="hidden whitespace-nowrap text-fg-muted md:table-cell md:px-2 md:py-2.5">
                    <span className="flex items-center gap-1.5">
                      <ChainLogo chain={row.chain} size={16} />
                      {row.chain}
                    </span>
                  </td>
                  <td className="col-start-2 row-start-1 text-right whitespace-nowrap md:px-2 md:py-2.5">
                    {ltv === null ? (
                      <span className="text-fg-subtle">not collected</span>
                    ) : (
                      <>
                        <span className="text-[15px] font-semibold tabular-nums">{formatLtv(ltv)}</span>
                        <span className="mt-1 flex justify-end">
                          <MiniBar max={1} segments={[{ value: ltv, className: "bg-borrow" }]} />
                        </span>
                      </>
                    )}
                  </td>
                  <td className="col-span-2 row-start-3 text-left whitespace-nowrap md:col-span-1 md:px-2 md:py-2.5 md:text-right" title={extra}>
                    <span className="font-medium">{loanAsset}</span>{" "}
                    {borrowApr === null ? (
                      <span className="text-fg-subtle">· cost —</span>
                    ) : (
                      <span className={`tabular-nums ${borrowApr > 8 ? "text-warn" : "text-fg-muted"}`}>at {borrowApr.toFixed(2)}%</span>
                    )}
                  </td>
                  <td className="col-start-2 row-start-2 text-right md:px-2 md:py-2.5 md:pr-4">
                    <ActionButton href={row.deepLink} platform={row.platform.name} category="borrow" specific={row.deepLinkIsSpecific} />
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr className="block md:table-row">
                <td colSpan={6} className="block px-4 py-10 text-center text-fg-muted md:table-cell">
                  Nothing matches those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!compact && visible.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full rounded-lg border bg-bg-raised py-2.5 text-sm font-medium text-fg-muted hover:text-fg"
        >
          {showAll ? "Show fewer" : `Show all ${visible.length} markets`}
        </button>
      )}
    </div>
  );
}
