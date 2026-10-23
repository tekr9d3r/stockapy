import Link from "next/link";
import { StockLogo } from "./StockLogo";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { formatApy, formatLtv } from "@/lib/format";

export type StockTileData = {
  ticker: string;
  name: string;
  bestEarn: number | null;
  bestFee: number | null;
  maxLtv: number | null;
  /** Active, non-speculative pools: shown when no rate can be quoted yet. */
  pools?: number;
};

/** One stock with its best figure per way to earn, linking to its page. */
export function StockTile({ s }: { s: StockTileData }) {
  return (
    <Link
      href={`/stock/${s.ticker.toLowerCase()}`}
      className="group rounded-xl border bg-bg-raised p-4 transition hover:border-border-strong hover:shadow-card"
    >
      <div className="flex items-center gap-2.5">
        <StockLogo ticker={s.ticker} size={32} />
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{s.ticker}</p>
          <p className="truncate text-xs text-fg-subtle">{s.name}</p>
        </div>
      </div>
      {s.bestEarn === null && s.bestFee === null && s.maxLtv === null ? (
        <p className="mt-3 text-xs text-fg-muted">
          {s.pools ?? 0} active {s.pools === 1 ? "pool" : "pools"} · see the stock page
        </p>
      ) : (
        <dl className="mt-3 space-y-1 text-xs">
          <Stat category="earn" label="Earn" value={s.bestEarn === null ? "—" : formatApy(s.bestEarn)} />
          <Stat category="liquidity" label="LP fees" value={s.bestFee === null ? "—" : formatApy(s.bestFee)} />
          <Stat category="borrow" label="Max LTV" value={s.maxLtv === null ? "—" : formatLtv(s.maxLtv)} />
        </dl>
      )}
    </Link>
  );
}

function Stat({ category, label, value }: { category: CategoryKey; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="flex items-center gap-1.5 text-fg-muted">
        <span aria-hidden="true" className={`size-1.5 rounded-full ${CATEGORIES[category].cls.bg}`} />
        {label}
      </dt>
      <dd className={`tabular-nums font-semibold ${value === "—" ? "text-fg-subtle" : "text-fg"}`}>{value}</dd>
    </div>
  );
}
