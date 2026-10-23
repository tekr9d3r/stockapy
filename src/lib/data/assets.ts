import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { loadSeed } from "./seed";
import type { UnderlyingAsset } from "./types";

const UNDERLYINGS = path.join(process.cwd(), "data", "underlyings.yaml");

let cached: UnderlyingAsset[] | null = null;

/**
 * Every asset we know: the hand-written ones in seed.yaml, plus those found by
 * scripts/discover-stock-tokens.ts (data/underlyings.yaml). Seed entries win
 * where both name the same ticker.
 */
export function loadAssets(): UnderlyingAsset[] {
  if (cached) return cached;
  const seed = loadSeed().underlying_assets;
  let found: UnderlyingAsset[] = [];
  try {
    found = (parse(fs.readFileSync(UNDERLYINGS, "utf8")) as UnderlyingAsset[] | null) ?? [];
  } catch {
    // No discovered assets yet.
  }
  const seeded = new Set(seed.map((a) => a.ticker));
  cached = [...seed, ...found.filter((a) => !seeded.has(a.ticker))];
  return cached;
}

export function assetByTicker(ticker: string): UnderlyingAsset | undefined {
  const t = ticker.toUpperCase();
  return loadAssets().find((a) => a.ticker.toUpperCase() === t);
}
