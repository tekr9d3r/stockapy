"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "./ActionButton";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "./Badge";
import { CollapsibleGroup, Metric } from "./CollapsibleGroup";
import { LiquidityTable } from "./LiquidityTable";
import { PlatformLogo } from "./PlatformLogo";
import { formatApy, formatUsd } from "@/lib/format";
import type { LiquidityRow } from "@/lib/data/liquidity";

type Sort = "fee" | "total" | "tvl" | "turnover" | "volume";
type PairFilter = "stock-stable" | "stock-crypto" | "stock-stock" | "all";

/** 0: fee APY over a full day; 1: over only a few hours; 2: no fee figure. */
const feeRank = (r: LiquidityRow) => (r.apyBase === null ? 2 : r.volumeWindowHours != null ? 1 : 0);

const ISSUER_LABEL: Record<string, string> = {
  xstocks: "xStocks", ondo: "Ondo", coinbase: "Coinbase", robinhood: "Robinhood", binance: "Binance bStocks",
};

/**
 * Filters, sorting and the venue/table toggle for liquidity pools. Defaults
 * match the headline figures: live stock/stablecoin pools of at least $10k,
 * sorted by fee APY rather than total APY.
 */
export function LiquidityExplorer({ rows }: { rows: LiquidityRow[] }) {
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState("all");
  const [issuer, setIssuer] = useState("all");
  const [chain, setChain] = useState("all");
  const [venue, setVenue] = useState("all");
  const [pair, setPair] = useState<PairFilter>("stock-stable");
  const [sort, setSort] = useState<Sort>("fee");
  const [grouped, setGrouped] = useState(true);
  const [feesOnly, setFeesOnly] = useState(false);
  const [showSpeculative, setShowSpeculative] = useState(false);

  const opts = useMemo(() => {
    const u = (f: (r: LiquidityRow) => string[]) => [...new Set(rows.flatMap(f))].sort();
    return {
      stocks: u((r) => r.underlyings),
      issuers: u((r) => r.issuers),
      chains: u((r) => [r.chain]),
      venues: [...new Map(rows.map((r) => [r.venue.id, r.venue.name])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [rows]);

  const speculativeCount = useMemo(() => rows.filter((r) => r.pairType === "stock-other").length, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (r.pairType === "stock-other" && !showSpeculative) return false;
      if (pair !== "all" && r.pairType !== pair && r.pairType !== "stock-other") return false;
      if (feesOnly && r.mostlyIncentives) return false;
      if (stock !== "all" && !r.underlyings.includes(stock)) return false;
      if (issuer !== "all" && !r.issuers.includes(issuer)) return false;
      if (chain !== "all" && r.chain !== chain) return false;
      if (venue !== "all" && r.venue.id !== venue) return false;
      if (q && ![r.symbol, r.venue.name, r.chain, ...r.underlyings].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
    const key: Record<Sort, (r: LiquidityRow) => number> = {
      fee: (r) => r.apyBase ?? -1,
      total: (r) => r.apyTotal ?? -1,
      tvl: (r) => r.tvlUsd,
      turnover: (r) => r.volumeToTvl,
      volume: (r) => r.volumeUsd1d,
    };
    // By fee: rates measured over a full day first, then rates from only a few
    // hours of trading (too noisy to lead with), then pools with no fee figure,
    // by volume.
    return out.sort((a, b) => {
      if (sort === "fee" && feeRank(a) !== feeRank(b)) return feeRank(a) - feeRank(b);
      if (sort === "fee" && a.apyBase === null && b.apyBase === null) return b.volumeUsd1d - a.volumeUsd1d;
      return key[sort](b) - key[sort](a);
    });
  }, [rows, query, stock, issuer, chain, venue, pair, sort, feesOnly, showSpeculative]);

  const groups = useMemo(() => {
    const m = new Map<string, LiquidityRow[]>();
    for (const r of visible) m.set(r.venue.id, [...(m.get(r.venue.id) ?? []), r]);
    return [...m.values()]
      .map((pools) => {
        const fees = (rank: number) =>
          pools.filter((p) => feeRank(p) === rank).map((p) => p.apyBase!);
        const fullDay = fees(0);
        const short = fees(1);
        return {
          venue: pools[0].venue,
          pools,
          topFee: fullDay.length ? Math.max(...fullDay) : null,
          /** Only shown when no pool here has a full day measured yet. */
          topFeeShort: short.length ? Math.max(...short) : null,
          tvl: pools.reduce((s, p) => s + p.tvlUsd, 0),
          volume: pools.reduce((s, p) => s + p.volumeUsd1d, 0),
          chains: [...new Set(pools.map((p) => p.chain))].sort(),
          tickers: [...new Set(pools.flatMap((p) => p.underlyings))].sort(),
        };
      })
      .sort((a, b) => b.tvl - a.tvl);
  }, [visible]);

  const select = "h-9 rounded-md border bg-bg-raised px-2 text-sm outline-none focus:border-accent";
  const toggle = "flex h-9 cursor-pointer items-center gap-1.5 rounded-md border bg-bg-raised px-2.5 text-sm";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search NVDA, Raydium…"
          aria-label="Search pools"
          className="h-9 min-w-[160px] flex-1 rounded-md border bg-bg-raised px-3 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <select aria-label="Stock" value={stock} onChange={(e) => setStock(e.target.value)} className={select}>
          <option value="all">All stocks</option>
          {opts.stocks.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={select}>
          <option value="fee">Sort: fee yield</option>
          <option value="tvl">Sort: TVL</option>
          <option value="volume">Sort: 24h volume</option>
        </select>
        <div className="flex h-9 overflow-hidden rounded-md border text-sm" role="group" aria-label="Layout">
          <button type="button" onClick={() => setGrouped(true)} className={`px-3 ${grouped ? "bg-accent text-accent-fg" : "bg-bg-raised"}`}>By venue</button>
          <button type="button" onClick={() => setGrouped(false)} className={`px-3 ${!grouped ? "bg-accent text-accent-fg" : "bg-bg-raised"}`}>All</button>
        </div>
        <details className="relative">
          <summary className={`${toggle} list-none [&::-webkit-details-marker]:hidden`}>
            <SlidersHorizontal size={14} aria-hidden="true" /> Filters
          </summary>
          <div className="absolute right-0 z-10 mt-1 flex w-60 flex-col gap-2 rounded-lg border bg-bg-raised p-3 shadow-card">
            <select aria-label="Pair type" value={pair} onChange={(e) => setPair(e.target.value as PairFilter)} className={select}>
              <option value="stock-stable">Stablecoin pairs</option>
              <option value="stock-crypto">Crypto pairs</option>
              <option value="stock-stock">Stock / stock</option>
              <option value="all">All pair types</option>
            </select>
            <select aria-label="Issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} className={select}>
              <option value="all">All issuers</option>
              {opts.issuers.map((s) => <option key={s} value={s}>{ISSUER_LABEL[s] ?? s}</option>)}
            </select>
            <select aria-label="Chain" value={chain} onChange={(e) => setChain(e.target.value)} className={select}>
              <option value="all">All chains</option>
              {opts.chains.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select aria-label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} className={select}>
              <option value="all">All venues</option>
              {opts.venues.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm" title="Hide pools where more than half the rate is incentives.">
              <input type="checkbox" checked={feesOnly} onChange={(e) => setFeesOnly(e.target.checked)} className="accent-accent" />
              Fees only
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm" title="Pairs against small or speculative tokens. You hold half of the other token.">
              <input type="checkbox" checked={showSpeculative} onChange={(e) => setShowSpeculative(e.target.checked)} className="accent-accent" />
              Speculative pairs ({speculativeCount})
            </label>
          </div>
        </details>
      </div>

      {grouped ? (
        <div className="space-y-2">
          {groups.map((g) => (
            <CollapsibleGroup
              key={g.venue.id}
              logo={<PlatformLogo id={g.venue.id} name={g.venue.name} />}
              title={g.venue.name}
              badges={<Badge>DEX</Badge>}
              subtitle={<>{g.pools.length} {g.pools.length === 1 ? "pool" : "pools"} · {g.chains.join(", ")} · {g.tickers.length} {g.tickers.length === 1 ? "stock" : "stocks"}</>}
              tickers={g.tickers}
              metrics={
                <>
                  <Metric label="Fee yield / yr" wide always>
                    {g.topFee === null && g.topFeeShort !== null ? (
                      <>
                        <span className="text-positive">up to {formatApy(g.topFeeShort)}</span>
                        <span className="block text-[11px] font-normal text-warn" title="Annualised from only a few hours of trading. Very noisy until a full day is measured.">
                          from a few hours of trading
                        </span>
                      </>
                    ) : g.topFee === null ? (
                      <span className="text-sm font-normal text-fg-subtle" title={g.pools[0]?.feeNote}>not published</span>
                    ) : g.topFee === 0 ? (
                      <span className="text-zero">0%</span>
                    ) : (
                      <span className="text-positive">up to {formatApy(g.topFee)}</span>
                    )}
                  </Metric>
                  <Metric label="Money in pool">{formatUsd(g.tvl)}</Metric>
                  <Metric label="Traded 24h">{formatUsd(g.volume)}</Metric>
                </>
              }
            >
              <LiquidityTable rows={g.pools} hideVenue />
              {g.venue.website && (
                <div className="mt-3">
                  <ActionButton href={g.venue.website} platform={g.venue.name} category="liquidity" specific={false} size="md" />
                </div>
              )}
            </CollapsibleGroup>
          ))}
          {groups.length === 0 && (
            <p className="rounded-lg border bg-bg-raised px-4 py-10 text-center text-sm text-fg-muted">Nothing matches those filters.</p>
          )}
        </div>
      ) : (
        <LiquidityTable rows={visible} />
      )}

      <p className="mt-2 text-xs text-fg-subtle">
        {visible.length} of {rows.length} active pools · before impermanent loss
      </p>
    </div>
  );
}
