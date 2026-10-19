import { loadSeed } from "@/lib/data/seed";
import type { Snapshot } from "@/lib/data/types";

const POOLS_URL = "https://yields.llama.fi/pools";
const LEND_BORROW_URL = "https://yields.llama.fi/lendBorrow";

/** The subset of the DefiLlama pool object we rely on. Verified against the live response. */
type LlamaPool = {
  pool: string;
  project: string;
  chain: string;
  symbol: string;
  tvlUsd: number | null;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  poolMeta: string | null;
};

/** The /lendBorrow companion endpoint, keyed by the same pool id. */
type LlamaLendBorrow = {
  pool: string;
  apyBaseBorrow: number | null;
  apyRewardBorrow: number | null;
  ltv: number | null;
  borrowable: boolean | null;
  mintedCoin: string | null;
};

export async function fetchDefiLlama(): Promise<Snapshot[]> {
  const res = await fetch(POOLS_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`DefiLlama responded ${res.status}`);

  const body = (await res.json()) as { status: string; data: LlamaPool[] };
  if (!Array.isArray(body.data)) throw new Error("DefiLlama response has no data array");

  // Borrow terms live on a separate endpoint. A failure here must not lose the
  // supply-side numbers, so it degrades to "no borrow data" instead of throwing.
  let borrowById = new Map<string, LlamaLendBorrow>();
  try {
    const borrowRes = await fetch(LEND_BORROW_URL, { headers: { accept: "application/json" } });
    if (borrowRes.ok) {
      const rows = (await borrowRes.json()) as LlamaLendBorrow[];
      if (Array.isArray(rows)) borrowById = new Map(rows.map((r) => [r.pool, r]));
    }
  } catch (err) {
    console.warn(`[defillama] lendBorrow unavailable, continuing without it: ${err}`);
  }

  const byId = new Map(body.data.map((p) => [p.pool, p]));
  const fetchedAt = new Date().toISOString();
  const snapshots: Snapshot[] = [];
  const missing: string[] = [];

  for (const opp of loadSeed().opportunities) {
    if (opp.data_source !== "defillama" || !opp.external_id) continue;

    const pool = byId.get(opp.external_id);
    if (!pool) {
      // The pool was delisted or re-keyed. Do not fall back to a symbol match:
      // symbols collide across chains and issuers.
      missing.push(`${opp.id} (${opp.external_id})`);
      continue;
    }

    // DefiLlama sends apyReward: null for a pool with no incentive programme, which
    // is a measured zero, not a gap. Only when the base is also missing do we genuinely
    // not know the split. Getting this wrong would let pure-interest pools drop out of
    // the "how much of this yield is real" figure.
    const apyReward =
      pool.apyReward ??
      (pool.apy !== null && pool.apyBase !== null
        ? Math.max(0, Number((pool.apy - pool.apyBase).toFixed(5)))
        : null);

    // LTV always comes from the collateral pool. The borrow APR may come from a
    // different pool: in a pooled market the stock reserve's own borrow rate is the
    // cost of borrowing the stock, not of borrowing a stablecoin against it.
    const collateral = borrowById.get(opp.external_id);
    const rateEntry = opp.borrow?.rate_pool
      ? borrowById.get(opp.borrow.rate_pool)
      : collateral;

    snapshots.push({
      opportunityId: opp.id,
      apyTotal: pool.apy,
      apyBase: pool.apyBase,
      apyReward,
      tvlUsd: pool.tvlUsd,
      // `borrowable` says whether the STOCK itself can be borrowed, which is a
      // different question from whether it works as collateral. Gating on it
      // silently dropped venues like Kamino's GOOGLx (60% LTV, not borrowable).
      // An ltv of 0 does mean "not accepted as collateral".
      ltv: collateral?.ltv ? collateral.ltv : null,
      borrowApr: opp.borrow ? (rateEntry?.apyBaseBorrow ?? null) : null,
      source: "defillama",
      fetchedAt,
    });
  }

  if (missing.length > 0) {
    console.warn(`[defillama] ${missing.length} seeded pool id(s) not found:\n  ${missing.join("\n  ")}`);
  }

  return snapshots;
}

/**
 * Discovery helper: tokenized-equity pools DefiLlama knows about that are NOT in
 * our seed. Run it after a fetch to find new venues worth adding.
 */
export async function findUnseededPools(): Promise<LlamaPool[]> {
  const res = await fetch(POOLS_URL, { headers: { accept: "application/json" } });
  const body = (await res.json()) as { status: string; data: LlamaPool[] };

  const seed = loadSeed();
  const seeded = new Set(
    seed.opportunities.map((o) => o.external_id).filter((id): id is string => !!id),
  );
  const tickers = seed.underlying_assets.map((a) => a.ticker);

  return body.data.filter(
    (p) =>
      !seeded.has(p.pool) &&
      tickers.some((t) => (p.symbol ?? "").toUpperCase().includes(t)) &&
      (p.tvlUsd ?? 0) > 10_000,
  );
}
