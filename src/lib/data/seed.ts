import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { Seed } from "./types";

const SEED_PATH = path.join(process.cwd(), "data", "seed.yaml");

let cached: Seed | null = null;

/**
 * Loads data/seed.yaml and checks referential integrity. Throws on a broken
 * reference so a bad seed fails the build instead of rendering empty cells.
 */
export function loadSeed(): Seed {
  if (cached) return cached;

  const seed = parse(fs.readFileSync(SEED_PATH, "utf8")) as Seed;

  const tickers = new Set(seed.underlying_assets.map((a) => a.ticker));
  const issuerIds = new Set(seed.issuers.map((i) => i.id));
  const platformIds = new Set(seed.platforms.map((p) => p.id));
  const symbols = new Set(seed.tokens.map((t) => t.symbol));
  const problems: string[] = [];

  for (const token of seed.tokens) {
    if (!tickers.has(token.underlying)) {
      problems.push(`token ${token.symbol} -> unknown underlying ${token.underlying}`);
    }
    if (!issuerIds.has(token.issuer)) {
      problems.push(`token ${token.symbol} -> unknown issuer ${token.issuer}`);
    }
  }

  const seenIds = new Set<string>();
  for (const opp of seed.opportunities) {
    if (seenIds.has(opp.id)) problems.push(`duplicate opportunity id ${opp.id}`);
    seenIds.add(opp.id);
    if (!symbols.has(opp.token)) {
      problems.push(`opportunity ${opp.id} -> unknown token ${opp.token}`);
    }
    if (!platformIds.has(opp.platform)) {
      problems.push(`opportunity ${opp.id} -> unknown platform ${opp.platform}`);
    }
    const needsExternalId = ["defillama", "aave_api", "morpho_api"];
    if (needsExternalId.includes(opp.data_source) && !opp.external_id) {
      problems.push(`opportunity ${opp.id} is sourced from ${opp.data_source} but has no external_id`);
    }
    // An unquoted 0x… id is parsed by YAML as a number and silently loses all
    // precision, which the API then rejects. Catch it here rather than at runtime.
    if (opp.external_id !== undefined && typeof opp.external_id !== "string") {
      problems.push(
        `opportunity ${opp.id} has a non-string external_id (${typeof opp.external_id}) — ` +
          `quote it in the YAML if it looks like 0x…`,
      );
    }
  }

  // The watchlist sits at the end of the file, so a stray opportunity pasted
  // below it silently becomes a watchlist entry. Check its shape too.
  for (const [index, entry] of (seed.watchlist ?? []).entries()) {
    for (const key of ["platform", "chain", "status", "note", "url"] as const) {
      if (!entry[key]) problems.push(`watchlist[${index}] is missing ${key}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`data/seed.yaml is inconsistent:\n  - ${problems.join("\n  - ")}`);
  }

  cached = seed;
  return seed;
}

export function assetByTicker(ticker: string) {
  return loadSeed().underlying_assets.find(
    (a) => a.ticker.toLowerCase() === ticker.toLowerCase(),
  );
}

export function tokenBySymbol(symbol: string) {
  return loadSeed().tokens.find((t) => t.symbol === symbol);
}

export function platformById(id: string) {
  return loadSeed().platforms.find((p) => p.id === id);
}

export function issuerById(id: string) {
  return loadSeed().issuers.find((i) => i.id === id);
}
