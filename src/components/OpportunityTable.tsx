"use client";

import { ActionButton } from "./ActionButton";
import { PlatformLogo } from "./Logo";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ApyCell } from "./ApyCell";
import { Badge } from "./Badge";
import { StockLogo } from "./StockLogo";
import { SlidersHorizontal } from "lucide-react";
import { ChainLogo } from "./Logo";
import { MiniBar } from "./MiniBar";
import {
  CATEGORY_LABEL,
  LOCKUP_LABEL,
  SOURCE_LABEL,
  formatPp,
  formatRelativeShort,
  formatUsd,
} from "@/lib/format";
import type { Row } from "@/lib/data/types";

type SortKey = "apy" | "tvl" | "stock";

/**
 * Every row is rendered on the server and shipped in the HTML; the filters only
 * hide rows client-side. Crawlers and AI fetchers see the complete table.
 */
export function OpportunityTable({
  rows,
  compact = false,
  /** Inside a platform's own section the platform name is on every row, so swap
   *  that column for the market name instead of repeating it 12 times. */
  hidePlatform = false,
}: {
  rows: Row[];
  compact?: boolean;
  hidePlatform?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [chain, setChain] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("apy");
  const [showEnded, setShowEnded] = useState(true);
  const endedCount = rows.filter((r) => r.status === "ended").length;

  const chains = useMemo(
    () => [...new Set(rows.map((r) => r.chain))].sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (!showEnded && row.status === "ended") return false;
      if (category !== "all" && row.category !== category) return false;
      if (kind !== "all" && row.platform.kind !== kind) return false;
      if (chain !== "all" && row.chain !== chain) return false;
      if (!q) return true;
      return [
        row.underlying.ticker,
        row.underlying.name,
        row.token.symbol,
        row.issuer.name,
        row.platform.name,
        row.chain,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "stock") return a.underlying.ticker.localeCompare(b.underlying.ticker);
      if (sort === "tvl") return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
      if (a.unmeasured !== b.unmeasured) return a.unmeasured ? 1 : -1;
      return (b.apyTotal ?? 0) - (a.apyTotal ?? 0);
    });
  }, [rows, query, category, kind, chain, sort, showEnded]);

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search NVDA, Kamino…"
            aria-label="Search opportunities"
            className="h-9 min-w-[180px] flex-1 rounded-md border bg-bg-raised px-3 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
          />
          <Select value={chain} onChange={setChain} label="Chain">
            <option value="all">All chains</option>
            {chains.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(v) => setSort(v as SortKey)} label="Sort by">
            <option value="apy">Sort: APY</option>
            <option value="tvl">Sort: TVL</option>
            <option value="stock">Sort: Stock</option>
          </Select>
          <details className="relative">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border bg-bg-raised px-3 text-sm [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal size={14} aria-hidden="true" /> Filters
            </summary>
            <div className="absolute right-0 z-10 mt-1 flex w-56 flex-col gap-2 rounded-lg border bg-bg-raised p-3 shadow-card">
              <Select value={category} onChange={setCategory} label="Category">
                <option value="all">All categories</option>
                <option value="earn">Earn</option>
                <option value="collateral">Collateral only</option>
                <option value="structured">Structured</option>
              </Select>
              <Select value={kind} onChange={setKind} label="Venue type">
                <option value="all">DeFi + CeFi</option>
                <option value="defi">DeFi</option>
                <option value="cefi">CeFi</option>
              </Select>
              {endedCount > 0 && (
                <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={showEnded} onChange={(e) => setShowEnded(e.target.checked)} className="accent-accent" />
                  Show ended ({endedCount})
                </label>
              )}
            </div>
          </details>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-bg-raised md:overflow-x-auto">
        <table className="block w-full border-collapse text-sm md:table md:min-w-[760px]">
          <caption className="sr-only">
            Yield opportunities on tokenized stocks, with base interest and token incentives
            shown separately.
          </caption>
          <thead className="hidden md:table-header-group">
            <tr className="border-b bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-muted">
              <Th className="pl-4">Stock</Th>
              <Th>{hidePlatform ? "Market" : "Platform"}</Th>
              <Th>Chain</Th>
              <Th className="text-right" title="Total APY. The bar splits it into interest (green) and token incentives (amber).">APY</Th>
              <Th className="text-right">TVL</Th>
              <Th className="pr-4 text-right">
                <span className="sr-only">Open market</span>
              </Th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {visible.map((row) => {
              const total = row.apyTotal ?? 0;
              const split =
                row.apyBase !== null && row.apyReward !== null
                  ? `${formatPp(row.apyBase)}pp interest + ${formatPp(row.apyReward)}pp incentives`
                  : "Split not disclosed";
              const source = `Updated ${formatRelativeShort(row.fetchedAt)} ago from ${SOURCE_LABEL[row.source] ?? row.source}`;
              return (
                <tr
                  key={row.id}
                  className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 border-b px-4 py-3 last:border-0 hover:bg-bg-subtle md:table-row md:p-0 ${
                    row.status === "ended" ? "opacity-60" : ""
                  }`}
                >
                  <td className="md:px-2 md:py-2.5 md:pl-4">
                    <Link
                      href={`/stock/${row.underlying.ticker.toLowerCase()}`}
                      className="flex items-center gap-2.5 hover:text-accent"
                    >
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
                      {!hidePlatform && <PlatformLogo id={row.platform.id} name={row.platform.name} size={20} />}
                      <span className="font-medium">
                        {hidePlatform ? (row.variant ?? "Main market") : row.platform.name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-fg-subtle md:hidden">
                        · <ChainLogo chain={row.chain} size={12} /> {row.chain}
                      </span>
                      {row.platform.kind === "cefi" && !hidePlatform && <Badge tone="accent">CeFi</Badge>}
                      {!row.listed && (
                        <Badge tone="warn" title="The venue does not list this market in its own interface. It is reachable only by direct link and has not been through their curation.">
                          Unlisted
                        </Badge>
                      )}
                      {row.status === "ended" && (
                        <Badge tone="ended" title={row.endedNote ?? `This programme ended${row.endedOn ? ` on ${row.endedOn}` : ""}.`}>
                          Ended
                        </Badge>
                      )}
                      {row.category !== "earn" && row.status === "live" && (
                        <Badge tone="warn" title="Your stock is only collateral here. It earns nothing.">
                          {CATEGORY_LABEL[row.category]}
                        </Badge>
                      )}
                      {row.lockup !== "none" && (
                        <Badge tone="neutral" title="You cannot withdraw instantly.">
                          {LOCKUP_LABEL[row.lockup]}
                          {row.withdrawalDelayDays ? ` ${row.withdrawalDelayDays}d` : ""}
                        </Badge>
                      )}
                    </div>
                    {!hidePlatform && row.variant && (
                      <div className="mt-0.5 hidden text-xs text-fg-subtle md:block">{row.variant}</div>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap text-fg-muted md:table-cell md:px-2 md:py-2.5">
                    <span className="flex items-center gap-1.5">
                      <ChainLogo chain={row.chain} size={16} />
                      {row.chain}
                    </span>
                  </td>
                  <td className="col-start-2 row-start-1 text-right md:px-2 md:py-2.5" title={`${split}. ${source}.`}>
                    <ApyCell row={row} />
                    {row.status === "live" && !row.unmeasured && total > 0 && row.apyBase !== null && row.apyReward !== null && (
                      <span className="mt-1 flex justify-end">
                        <MiniBar
                          max={total}
                          segments={[
                            { value: row.apyBase, className: "bg-positive" },
                            { value: row.apyReward, className: "bg-warn" },
                          ]}
                        />
                      </span>
                    )}
                    <span className="sr-only">{split}.</span>
                  </td>
                  <td className="tnum hidden text-right whitespace-nowrap text-fg-muted md:table-cell md:px-2 md:py-2.5">
                    {row.chartUrl ? (
                      <a href={row.chartUrl} target="_blank" rel="noopener nofollow" title="Rate and TVL history — opens in a new tab" className="hover:text-accent hover:underline">
                        {formatUsd(row.tvlUsd)}
                      </a>
                    ) : (
                      formatUsd(row.tvlUsd)
                    )}
                  </td>
                  <td className="col-start-2 row-start-2 text-right md:px-2 md:py-2.5 md:pr-4">
                    <ActionButton
                      href={row.deepLink}
                      platform={row.platform.name}
                      category={row.category === "earn" ? "earn" : "borrow"}
                      specific={row.deepLinkIsSpecific && row.status === "live"}
                    />
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

      {!compact && (
        <p className="mt-2 text-xs text-fg-subtle">
          {visible.length} of {rows.length} · bar = interest <span className="text-positive">■</span> vs incentives{" "}
          <span className="text-warn">■</span>
        </p>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <th scope="col" title={title} className={`px-2 py-2 font-medium ${className}`}>
      {children}
    </th>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border bg-bg-raised px-2 text-sm outline-none focus:border-accent"
    >
      {children}
    </select>
  );
}
