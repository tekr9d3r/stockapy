import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import {
  buildIndex,
  classifyPoolType,
  matchPool,
  parseFeeTier,
  type RegistryToken,
} from "@/lib/liquidity/classify";
import { SKIPPED_PROJECTS, VENUES } from "@/lib/liquidity/venues";
import type {
  LiquidityFile,
  LiquidityPool,
  ReviewPool,
  SkippedPool,
} from "@/lib/liquidity/types";

const POOLS_URL = "https://yields.llama.fi/pools";
const REGISTRY = path.join(process.cwd(), "data", "stock-tokens.yaml");

/** Below this a pool is treated as gone: emptied pools report absurd rates. */
const DEAD_TVL_USD = 100;

type LlamaPool = {
  pool: string;
  project: string;
  chain: string;
  symbol: string;
  exposure: string | null;
  poolMeta: string | null;
  tvlUsd: number | null;
  apyBase: number | null;
  apyReward: number | null;
  apyBase7d: number | null;
  volumeUsd1d: number | null;
  volumeUsd7d: number | null;
  ilRisk: string | null;
  underlyingTokens: string[] | null;
};

export function loadRegistry(): RegistryToken[] {
  return parse(fs.readFileSync(REGISTRY, "utf8")) as RegistryToken[];
}

const round = (v: number | null | undefined, dp: number) =>
  v === null || v === undefined || !Number.isFinite(v) ? null : Number(v.toFixed(dp));

/**
 * Builds the liquidity file from DefiLlama, carrying forward pools from the
 * previous run that have since disappeared or emptied, marked Ended.
 */
export async function fetchLiquidity(previous: LiquidityFile | null): Promise<LiquidityFile> {
  const res = await fetch(POOLS_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`DefiLlama responded ${res.status}`);
  const body = (await res.json()) as { data: LlamaPool[] };
  if (!Array.isArray(body.data)) throw new Error("DefiLlama response has no data array");

  const registry = loadRegistry();
  const index = buildIndex(registry);
  const tickers = new Set(registry.map((t) => t.underlying));
  const fetchedAt = new Date().toISOString();
  const today = fetchedAt.slice(0, 10);
  const prev = new Map((previous?.pools ?? []).map((p) => [p.id, p]));

  const pools: LiquidityPool[] = [];
  const skipped: SkippedPool[] = [];
  const review: ReviewPool[] = [];
  const seen = new Set<string>();

  for (const p of body.data) {
    if (p.exposure !== "multi") continue;
    const result = matchPool(p, index, tickers);

    if (!result.match) {
      if (result.review) {
        review.push({ id: p.pool, project: p.project, chain: p.chain, symbol: p.symbol, tvlUsd: round(p.tvlUsd, 0), reason: result.review });
      }
      continue;
    }

    const venue = VENUES[p.project];
    if (!venue) {
      skipped.push({
        id: p.pool, project: p.project, chain: p.chain, symbol: p.symbol,
        reason: SKIPPED_PROJECTS[p.project] ?? "Venue not reviewed yet. Add it to VENUES once checked.",
      });
      continue;
    }

    const before = prev.get(p.pool);
    const dead = (p.tvlUsd ?? 0) < DEAD_TVL_USD;
    // An emptied pool keeps the last numbers it had while it was alive.
    if (dead && !before) continue;
    seen.add(p.pool);
    if (dead && before) {
      pools.push({ ...before, status: "ended", endedOn: before.endedOn ?? today });
      continue;
    }

    const m = result.match;
    pools.push({
      id: p.pool,
      project: p.project,
      venueId: venue.id,
      chain: p.chain,
      symbol: p.symbol,
      legs: m.legs.map((l) => ({
        symbol: l.symbol,
        address: l.address,
        stock: l.stock ? { symbol: l.stock.symbol, underlying: l.stock.underlying, issuer: l.stock.issuer } : null,
      })),
      underlyings: [...new Set(m.stockLegs.map((s) => s.underlying))],
      issuers: [...new Set(m.stockLegs.map((s) => s.issuer))],
      pairType: m.pairType,
      poolType: classifyPoolType(p.project, p.poolMeta),
      feeTier: parseFeeTier(p.poolMeta),
      apyBase: round(p.apyBase, 4),
      apyReward: round(p.apyReward, 4),
      apyBase7d: round(p.apyBase7d, 4),
      tvlUsd: round(p.tvlUsd, 0),
      volumeUsd1d: round(p.volumeUsd1d, 0),
      volumeUsd7d: round(p.volumeUsd7d, 0),
      ilRisk: p.ilRisk ?? null,
      matchedBy: m.matchedBy,
      source: "defillama",
      fetchedAt,
      firstSeen: before?.firstSeen ?? today,
      status: "live",
      endedOn: null,
    });
  }

  // Pools that vanished from DefiLlama entirely keep their last record, Ended.
  for (const [id, before] of prev) {
    if (seen.has(id)) continue;
    pools.push({ ...before, status: "ended", endedOn: before.endedOn ?? today });
  }

  return { fetchedAt, pools, skipped, review };
}
