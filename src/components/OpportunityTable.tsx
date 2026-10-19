"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ApyCell } from "./ApyCell";
import { Badge } from "./Badge";
import {
  CATEGORY_LABEL,
  LOCKUP_LABEL,
  SOURCE_LABEL,
  formatRelative,
  formatUsd,
} from "@/lib/format";
import type { Row } from "@/lib/data/types";

type SortKey = "apy" | "tvl" | "stock";

/**
 * Every row is rendered on the server and shipped in the HTML; the filters only
 * hide rows client-side. Crawlers and AI fetchers see the complete table.
 */
export function OpportunityTable({ rows, compact = false }: { rows: Row[]; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [chain, setChain] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("apy");

  const chains = useMemo(
    () => [...new Set(rows.map((r) => r.chain))].sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
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
  }, [rows, query, category, kind, chain, sort]);

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search NVDA, xStocks, Kamino…"
            aria-label="Search opportunities"
            className="h-9 min-w-[200px] flex-1 rounded-md border bg-bg-raised px-3 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
          />
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
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-bg-raised">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <caption className="sr-only">
            Yield opportunities on tokenized stocks, with base interest and token incentives
            shown separately.
          </caption>
          <thead>
            <tr className="border-b bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-muted">
              <Th className="pl-4">Stock</Th>
              <Th>Token</Th>
              <Th>Platform</Th>
              <Th>Chain</Th>
              <Th className="text-right">APY</Th>
              <Th className="text-right" title="Interest actually paid by borrowers.">
                Base
              </Th>
              <Th className="text-right" title="Token incentives. Can stop at any time.">
                Rewards
              </Th>
              <Th className="text-right">TVL</Th>
              <Th>Lockup</Th>
              <Th className="pr-4">Updated</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-bg-subtle">
                <td className="py-2.5 pl-4">
                  <Link
                    href={`/stock/${row.underlying.ticker.toLowerCase()}`}
                    className="font-medium hover:text-accent hover:underline"
                  >
                    {row.underlying.ticker}
                  </Link>
                </td>
                <td className="py-2.5">
                  <span className="font-medium">{row.token.symbol}</span>
                  <span className="ml-1.5 text-xs text-fg-subtle">{row.issuer.name}</span>
                </td>
                <td className="py-2.5">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="hover:text-accent hover:underline"
                  >
                    {row.platform.name}
                  </a>
                  {row.variant && (
                    <span className="ml-1.5 text-xs text-fg-subtle">{row.variant}</span>
                  )}
                  <div className="mt-0.5 flex gap-1">
                    <Badge tone={row.platform.kind === "cefi" ? "accent" : "neutral"}>
                      {row.platform.kind === "cefi" ? "CeFi" : "DeFi"}
                    </Badge>
                    {row.category !== "earn" && (
                      <Badge
                        tone="warn"
                        title="Your stock is only collateral here. It earns nothing."
                      >
                        {CATEGORY_LABEL[row.category]}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-2.5 text-fg-muted">{row.chain}</td>
                <td className="py-2.5 text-right">
                  <ApyCell row={row} />
                </td>
                <td className="tnum py-2.5 text-right text-fg-muted">
                  {row.apyBase === null ? "—" : `${row.apyBase.toFixed(2)}`}
                </td>
                <td className="tnum py-2.5 text-right text-fg-muted">
                  {row.apyReward === null ? "—" : `${row.apyReward.toFixed(2)}`}
                </td>
                <td className="tnum py-2.5 text-right text-fg-muted">
                  {formatUsd(row.tvlUsd)}
                </td>
                <td className="py-2.5 text-fg-muted">
                  {LOCKUP_LABEL[row.lockup]}
                  {row.withdrawalDelayDays ? ` · ${row.withdrawalDelayDays}d` : ""}
                </td>
                <td className="py-2.5 pr-4 text-xs text-fg-subtle">
                  <span title={`Source: ${SOURCE_LABEL[row.source] ?? row.source}`}>
                    {formatRelative(row.fetchedAt)}
                  </span>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-fg-muted">
                  Nothing matches those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-fg-subtle">
        Showing {visible.length} of {rows.length} opportunities. Base and Rewards are
        percentage points of the total APY.
      </p>
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
