import { loadSeed } from "@/lib/data/seed";
import type { Snapshot } from "@/lib/data/types";

const POOLS_URL = "https://yields.llama.fi/pools";

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

export async function fetchDefiLlama(): Promise<Snapshot[]> {
  const res = await fetch(POOLS_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`DefiLlama responded ${res.status}`);

  const body = (await res.json()) as { status: string; data: LlamaPool[] };
  if (!Array.isArray(body.data)) throw new Error("DefiLlama response has no data array");

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

    snapshots.push({
      opportunityId: opp.id,
      apyTotal: pool.apy,
      apyBase: pool.apyBase,
      apyReward,
      tvlUsd: pool.tvlUsd,
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
