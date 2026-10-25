import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { buildIndex, cleanSymbol, type RegistryToken } from "@/lib/liquidity/classify";
import type { LiquidityFile, LiquidityPool, LiquiditySource, ReviewPool } from "@/lib/liquidity/types";
import { fetchAeroSugar } from "./liquidity/aero";
import { fetchGeckoTerminal } from "./liquidity/geckoterminal";
import { fetchRaydium } from "./liquidity/raydium";

const REGISTRY = path.join(process.cwd(), "data", "stock-tokens.yaml");

/**
 * Only pools that are actually trading are listed. Below $1,000 of volume a day a
 * pool is not meaningfully traded and its fee rate is noise; below $10k of TVL the
 * rate vanishes as soon as real money arrives.
 */
export const ACTIVE_MIN_VOLUME_USD = 1_000;
export const MIN_TVL_USD = 10_000;

/**
 * Token symbols come from third parties and anyone can name a token anything.
 * They are cleaned once here, after each venue has classified its pools (which
 * needs the original symbols), and before they are stored or shown anywhere.
 */
const cleanPair = (pair: string) => pair.split(" / ").map(cleanSymbol).join(" / ");

function sanitizePool(p: LiquidityPool): LiquidityPool {
  return {
    ...p,
    symbol: cleanPair(p.symbol),
    legs: p.legs.map((l) => ({ ...l, symbol: cleanSymbol(l.symbol) })),
    emissions: p.emissions ? { ...p.emissions, token: cleanSymbol(p.emissions.token) } : p.emissions,
  };
}

export function loadRegistry(): RegistryToken[] {
  return parse(fs.readFileSync(REGISTRY, "utf8")) as RegistryToken[];
}

/**
 * Runs each source in isolation. If one fails, its pools from the previous run
 * are kept rather than dropping a whole venue off the page for an hour.
 */
export async function fetchLiquidity(previous: LiquidityFile | null): Promise<LiquidityFile> {
  const registry = loadRegistry();
  const index = buildIndex(registry);
  const fetchedAt = new Date().toISOString();
  const sources: LiquidityFile["sources"] = {};
  const all: LiquidityPool[] = [];
  const review: ReviewPool[] = [];
  let otherVenues = 0;

  const run = async (name: string, source: LiquiditySource, fn: () => Promise<LiquidityPool[]>) => {
    try {
      const pools = await fn();
      all.push(...pools);
      sources[name] = { ok: true, count: pools.length };
    } catch (err) {
      const kept = (previous?.pools ?? []).filter((p) => p.source === source);
      all.push(...kept);
      sources[name] = { ok: false, count: kept.length, error: String(err) };
    }
  };

  await run("raydium", "raydium-api", async () => (await fetchRaydium(registry, index, fetchedAt)).pools);
  // Aero pools created since the merger, read on-chain from Aero's own contract.
  await run("aero-sugar", "aero-sugar", async () => {
    const r = await fetchAeroSugar(index, fetchedAt);
    review.push(...r.review);
    return r.pools;
  });
  // Uniswap, plus Aero pools from before the merger, which Sugar does not cover.
  await run("geckoterminal", "geckoterminal", async () => {
    const r = await fetchGeckoTerminal(registry, index, fetchedAt);
    otherVenues = r.otherVenues;
    return r.pools;
  });

  if (Object.values(sources).every((s) => !s.ok)) throw new Error("every liquidity source failed");

  // A pool seen by two sources is listed once, from the first (most direct) one.
  const seen = new Set<string>();
  const unique = all.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).map(sanitizePool);

  let inactive = 0;
  let belowTvl = 0;
  const pools = unique.filter((p) => {
    if (p.volumeUsd1d < ACTIVE_MIN_VOLUME_USD) return inactive++, false;
    if (p.tvlUsd < MIN_TVL_USD) return belowTvl++, false;
    return true;
  });

  return {
    fetchedAt,
    sources,
    pools,
    excluded: { inactive, belowTvl, otherVenues },
    review: review.map((r) => ({ ...r, symbol: cleanPair(r.symbol) })),
  };
}
