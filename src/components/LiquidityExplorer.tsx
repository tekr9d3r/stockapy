"use client";

import { useMemo, useState } from "react";
import { Badge } from "./Badge";
import { CollapsibleGroup, Metric } from "./CollapsibleGroup";
import { LiquidityTable } from "./LiquidityTable";
import { PlatformLogo } from "./PlatformLogo";
import { formatApy, formatUsd } from "@/lib/format";
import type { LiquidityRow } from "@/lib/data/liquidity";

type Sort = "fee" | "total" | "tvl" | "turnover" | "volume";
type PairFilter = "stock-stable" | "stock-crypto" | "stock-stock" | "all";

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
    // Pools with no published fee figure sort after those with one, by volume.
    return out.sort((a, b) => {
      if (sort === "fee" && (a.apyBase === null) !== (b.apyBase === null)) return a.apyBase === null ? 1 : -1;
      if (sort === "fee" && a.apyBase === null && b.apyBase === null) return b.volumeUsd1d - a.volumeUsd1d;
      return key[sort](b) - key[sort](a);
    });
  }, [rows, query, stock, issuer, chain, venue, pair, sort, feesOnly, showSpeculative]);

  const groups = useMemo(() => {
    const m = new Map<string, LiquidityRow[]>();
    for (const r of visible) m.set(r.venue.id, [...(m.get(r.venue.id) ?? []), r]);
    return [...m.values()]
      .map((pools) => {
        const fees = pools.map((p) => p.apyBase).filter((v): v is number => v !== null);
        return {
          venue: pools[0].venue,
          pools,
          topFee: fees.length ? Math.max(...fees) : null,
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
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search NVDA, Raydium, Base…"
          aria-label="Search pools"
          className="h-9 min-w-[180px] flex-1 rounded-md border bg-bg-raised px-3 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <select aria-label="Pair type" value={pair} onChange={(e) => setPair(e.target.value as PairFilter)} className={select}>
          <option value="stock-stable">Stablecoin pairs</option>
          <option value="stock-crypto">Crypto pairs</option>
          <option value="stock-stock">Stock / stock</option>
          <option value="all">All pair types</option>
        </select>
        <select aria-label="Stock" value={stock} onChange={(e) => setStock(e.target.value)} className={select}>
          <option value="all">All stocks</option>
          {opts.stocks.map((s) => <option key={s} value={s}>{s}</option>)}
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
        <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={select}>
          <option value="fee">Sort: Fee APY</option>
          <option value="total">Sort: Total APY</option>
          <option value="tvl">Sort: TVL</option>
          <option value="volume">Sort: 24h volume</option>
          <option value="turnover">Sort: Vol/TVL</option>
        </select>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex h-9 overflow-hidden rounded-md border text-sm" role="group" aria-label="Layout">
          <button type="button" onClick={() => setGrouped(true)} className={`px-3 ${grouped ? "bg-accent text-accent-fg" : "bg-bg-raised"}`}>By venue</button>
          <button type="button" onClick={() => setGrouped(false)} className={`px-3 ${!grouped ? "bg-accent text-accent-fg" : "bg-bg-raised"}`}>One table</button>
        </div>
        <label className={toggle} title="Hide pools where more than half the rate is incentives.">
          <input type="checkbox" checked={feesOnly} onChange={(e) => setFeesOnly(e.target.checked)} className="accent-accent" />
          Fees only
        </label>
        <label className={toggle} title="Pairs against small or speculative tokens. You hold half of the other token.">
          <input type="checkbox" checked={showSpeculative} onChange={(e) => setShowSpeculative(e.target.checked)} className="accent-accent" />
          Speculative pairs ({speculativeCount})
        </label>
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
                  <Metric label="Fee APY" wide always>
                    {g.topFee === null ? (
                      <span className="text-sm font-normal text-fg-subtle" title={g.pools[0]?.feeNote}>not published</span>
                    ) : g.topFee === 0 ? (
                      <span className="text-zero">0%</span>
                    ) : (
                      <span className="text-positive">up to {formatApy(g.topFee)}</span>
                    )}
                  </Metric>
                  <Metric label="TVL">{formatUsd(g.tvl)}</Metric>
                  <Metric label="24h vol">{formatUsd(g.volume)}</Metric>
                </>
              }
            >
              <LiquidityTable rows={g.pools} hideVenue />
              {g.venue.website && (
                <a href={g.venue.website} target="_blank" rel="noopener nofollow" className="mt-3 inline-block text-sm text-accent hover:underline">
                  Open {g.venue.name} →
                </a>
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

      <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
        Showing {visible.length} of {rows.length} active pools (traded at least $1,000 in the last 24 hours, $10k+ in the pool). Every rate is{" "}
        <strong className="text-fg-muted">before impermanent loss</strong>, and concentrated-liquidity rates assume your position stays in range.
        Fee APY is what reaches the liquidity provider: after Raydium&rsquo;s 16% cut, before any Uniswap protocol fee, and not published by Aero.
      </p>
    </div>
  );
}
