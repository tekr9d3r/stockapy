import type { LiquidityItem, OpportunityItem } from "./serialize";

/**
 * Query parsing and filtering for the v1 API. Pure functions over plain records,
 * so they are tested without loading any data. Unknown parameters are rejected
 * rather than ignored: an agent that typos `tikcer` should hear about it.
 */
export type Query = {
  ticker?: string;
  chain?: string;
  platform?: string;
  venue?: string;
  loanAsset?: string;
  status: "live" | "ended" | "all";
  pair: "stable" | "all";
  minTvl: number;
  sort: string;
  limit: number;
};

export type Endpoint = { params: string[]; sorts: string[]; defaultSort: string };

export const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

export const ENDPOINTS = {
  earn: { params: ["ticker", "chain", "platform", "status", "min_tvl", "sort", "limit"], sorts: ["apy", "tvl"], defaultSort: "apy" },
  liquidity: { params: ["ticker", "chain", "venue", "pair", "min_tvl", "sort", "limit"], sorts: ["fee", "tvl", "volume"], defaultSort: "fee" },
  borrow: { params: ["ticker", "chain", "platform", "loan_asset", "sort", "limit"], sorts: ["ltv", "cost"], defaultSort: "ltv" },
} satisfies Record<string, Endpoint>;

export function parseQuery(sp: URLSearchParams, ep: Endpoint): { ok: true; q: Query } | { ok: false; error: string } {
  for (const key of sp.keys()) {
    if (!ep.params.includes(key)) {
      return { ok: false, error: `Unknown parameter "${key}". Allowed: ${ep.params.join(", ")}.` };
    }
  }
  const text = (k: string) => {
    const v = sp.get(k)?.trim();
    return v ? v : undefined;
  };

  const status = (text("status") ?? "live").toLowerCase();
  if (!["live", "ended", "all"].includes(status)) return { ok: false, error: `status must be live, ended or all.` };

  const pair = (text("pair") ?? "stable").toLowerCase();
  if (!["stable", "all"].includes(pair)) return { ok: false, error: `pair must be stable or all.` };

  const minTvlRaw = text("min_tvl");
  const minTvl = minTvlRaw === undefined ? 0 : Number(minTvlRaw);
  if (!Number.isFinite(minTvl) || minTvl < 0) return { ok: false, error: `min_tvl must be a number of US dollars, 0 or more.` };

  const sort = (text("sort") ?? ep.defaultSort).toLowerCase();
  if (!ep.sorts.includes(sort)) return { ok: false, error: `sort must be one of: ${ep.sorts.join(", ")}.` };

  const limitRaw = text("limit");
  const limit = limitRaw === undefined ? DEFAULT_LIMIT : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1) return { ok: false, error: `limit must be a whole number from 1 to ${MAX_LIMIT}.` };

  return {
    ok: true,
    q: {
      ticker: text("ticker"),
      chain: text("chain"),
      platform: text("platform"),
      venue: text("venue"),
      loanAsset: text("loan_asset"),
      status: status as Query["status"],
      pair: pair as Query["pair"],
      minTvl,
      sort,
      limit: Math.min(limit, MAX_LIMIT),
    },
  };
}

const norm = (s: string) => s.trim().toLowerCase();
/** BSC (liquidity sources) and BNB Chain (seed) are the same chain. */
const chainKey = (s: string) => (["bsc", "bnb", "bnb chain"].includes(norm(s)) ? "bnb chain" : norm(s));
const eq = (a: string, b: string | undefined) => b === undefined || norm(a) === norm(b);
/** Missing values always sort last, whichever the direction. */
function nullsLast(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * dir;
}
const desc = (a: number | null, b: number | null) => nullsLast(a, b, -1);
const asc = (a: number | null, b: number | null) => nullsLast(a, b, 1);

export function filterEarn(items: OpportunityItem[], q: Query): OpportunityItem[] {
  return items
    .filter(
      (i) =>
        i.category === "earn" &&
        (q.status === "all" || i.status === q.status) &&
        eq(i.underlyingTicker, q.ticker) &&
        (q.chain === undefined || chainKey(i.chain) === chainKey(q.chain)) &&
        eq(i.platform, q.platform) &&
        (i.tvlUsd ?? 0) >= q.minTvl,
    )
    .sort((a, b) => (q.sort === "tvl" ? desc(a.tvlUsd, b.tvlUsd) : desc(a.apyTotal, b.apyTotal)))
    .slice(0, q.limit);
}

export function filterBorrow(items: OpportunityItem[], q: Query): OpportunityItem[] {
  return items
    .filter(
      (i) =>
        i.borrow !== null &&
        i.status === "live" &&
        eq(i.underlyingTicker, q.ticker) &&
        (q.chain === undefined || chainKey(i.chain) === chainKey(q.chain)) &&
        eq(i.platform, q.platform) &&
        eq(i.borrow.loanAsset, q.loanAsset),
    )
    .sort((a, b) =>
      q.sort === "cost" ? asc(a.borrow!.borrowApr, b.borrow!.borrowApr) : desc(a.borrow!.maxLtv, b.borrow!.maxLtv),
    )
    .slice(0, q.limit);
}

export function filterLiquidity(items: LiquidityItem[], q: Query): LiquidityItem[] {
  const key = { fee: "apyBase", tvl: "tvlUsd", volume: "volumeUsd1d" } as const;
  return items
    .filter(
      (i) =>
        (q.pair === "all" || i.pairType === "stock-stable") &&
        (q.ticker === undefined || i.underlyingTickers.some((t) => norm(t) === norm(q.ticker!))) &&
        (q.chain === undefined || chainKey(i.chain) === chainKey(q.chain)) &&
        eq(i.venue, q.venue) &&
        i.tvlUsd >= q.minTvl,
    )
    .sort((a, b) => desc(a[key[q.sort as keyof typeof key]], b[key[q.sort as keyof typeof key]]))
    .slice(0, q.limit);
}
