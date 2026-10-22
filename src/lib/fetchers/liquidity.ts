import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { buildIndex, type RegistryToken } from "@/lib/liquidity/classify";
import type { LiquidityFile, LiquidityPool } from "@/lib/liquidity/types";
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

export function loadRegistry(): RegistryToken[] {
  return parse(fs.readFileSync(REGISTRY, "utf8")) as RegistryToken[];
}

/**
 * Runs both sources in isolation. If one fails, its pools from the previous run
 * are kept rather than dropping a whole venue off the page for an hour.
 */
export async function fetchLiquidity(previous: LiquidityFile | null): Promise<LiquidityFile> {
  const registry = loadRegistry();
  const index = buildIndex(registry);
  const fetchedAt = new Date().toISOString();
  const sources: LiquidityFile["sources"] = {};
  const all: LiquidityPool[] = [];
  let otherVenues = 0;

  const run = async (name: string, venues: string[], fn: () => Promise<LiquidityPool[]>) => {
    try {
      const pools = await fn();
      all.push(...pools);
      sources[name] = { ok: true, count: pools.length };
    } catch (err) {
      const kept = (previous?.pools ?? []).filter((p) => venues.includes(p.venueId));
      all.push(...kept);
      sources[name] = { ok: false, count: kept.length, error: String(err) };
    }
  };

  await run("raydium", ["raydium"], async () => (await fetchRaydium(registry, index, fetchedAt)).pools);
  await run("geckoterminal", ["uniswap", "aero"], async () => {
    const r = await fetchGeckoTerminal(registry, index, fetchedAt);
    otherVenues = r.otherVenues;
    return r.pools;
  });

  if (Object.values(sources).every((s) => !s.ok)) throw new Error("every liquidity source failed");

  let inactive = 0;
  let belowTvl = 0;
  const pools = all.filter((p) => {
    if (p.volumeUsd1d < ACTIVE_MIN_VOLUME_USD) return inactive++, false;
    if (p.tvlUsd < MIN_TVL_USD) return belowTvl++, false;
    return true;
  });

  return { fetchedAt, sources, pools, excluded: { inactive, belowTvl, otherVenues }, review: [] };
}
