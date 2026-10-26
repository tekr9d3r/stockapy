import Link from "next/link";
import { StockLogo } from "./StockLogo";
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
      className="group border-t pt-3 pb-1 transition hover:border-fg"
    >
      <div className="flex items-center gap-2.5">
        <StockLogo ticker={s.ticker} size={32} />
        <div className="min-w-0">
          <p className="font-semibold leading-tight group-hover:underline">{s.ticker}</p>
          <p className="truncate text-xs text-fg-subtle">{s.name}</p>
        </div>
      </div>
      {s.bestEarn === null && s.bestFee === null && s.maxLtv === null ? (
        <p className="mt-3 text-xs text-fg-muted">
          {s.pools ?? 0} active {s.pools === 1 ? "pool" : "pools"} · see the stock page
        </p>
      ) : (
        <dl className="mt-3 space-y-1 text-xs">
          <Stat label="Lend" value={s.bestEarn === null ? "—" : formatApy(s.bestEarn)} />
          <Stat label="Market-make" value={s.bestFee === null ? "—" : formatApy(s.bestFee)} />
          <Stat label="Borrow up to" value={s.maxLtv === null ? "—" : formatLtv(s.maxLtv)} />
        </dl>
      )}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-fg-muted">{label}</dt>
      <dd className={`tabular-nums font-semibold ${value === "—" ? "text-fg-subtle" : "text-fg"}`}>{value}</dd>
    </div>
  );
}
