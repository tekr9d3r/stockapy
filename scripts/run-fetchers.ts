/**
 * Runs every fetcher and writes data/snapshots/latest.json plus an hourly archive.
 *
 * Each source is isolated: one failing API must not empty the others. On a total
 * failure nothing is written, so the site keeps serving the last good snapshot.
 *
 * Liquidity is a separate step writing its own file (data/snapshots/liquidity.json,
 * latest only, no hourly archive). Earn/Borrow and Liquidity
 * succeed or fail independently of each other.
 *
 *   npx tsx scripts/run-fetchers.ts            fetch and write
 *   npx tsx scripts/run-fetchers.ts --discover also list unseeded equity pools
 */
import fs from "node:fs";
import path from "node:path";
import { fetchAave } from "../src/lib/fetchers/aave";
import { fetchKrakenInk } from "../src/lib/fetchers/krakenInk";
import { fetchMorpho } from "../src/lib/fetchers/morpho";
import { fetchDefiLlama, findUnseededPools } from "../src/lib/fetchers/defillama";
import { fetchLiquidity } from "../src/lib/fetchers/liquidity";
import type { Snapshot, SnapshotFile } from "../src/lib/data/types";
import type { LiquidityFile } from "../src/lib/liquidity/types";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

const SOURCES: Record<string, () => Promise<Snapshot[]>> = {
  defillama: fetchDefiLlama,
  aave: fetchAave,
  morpho: fetchMorpho,
  krakenInk: fetchKrakenInk,
};

async function main() {
  const fetchedAt = new Date().toISOString();
  const snapshots: Snapshot[] = [];
  const sources: SnapshotFile["sources"] = {};

  for (const [name, run] of Object.entries(SOURCES)) {
    try {
      const result = await run();
      snapshots.push(...result);
      sources[name] = { ok: true, count: result.length };
      console.log(`[${name}] ok, ${result.length} snapshots`);
    } catch (err) {
      sources[name] = { ok: false, count: 0, error: String(err) };
      console.error(`[${name}] FAILED: ${err}`);
    }
  }

  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const earnOk = snapshots.length > 0;
  if (earnOk) {
    const file: SnapshotFile = { fetchedAt, sources, snapshots };
    fs.writeFileSync(path.join(SNAPSHOT_DIR, "latest.json"), JSON.stringify(file, null, 2) + "\n");
    const stamp = fetchedAt.slice(0, 13).replace(/[:T]/g, "-");
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${stamp}.json`), JSON.stringify(file, null, 2) + "\n");
    console.log(`Wrote latest.json and ${stamp}.json (${snapshots.length} snapshots)`);
  } else {
    console.error("No earn/borrow source returned anything. Keeping the previous snapshot.");
  }

  const liquidityOk = await runLiquidity();
  if (!earnOk && !liquidityOk) process.exit(1);

  if (process.argv.includes("--discover")) {
    const unseeded = await findUnseededPools();
    console.log(`\n${unseeded.length} unseeded equity-ish pools over $10k TVL:`);
    for (const p of unseeded.sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0)).slice(0, 40)) {
      console.log(
        `  ${p.symbol.padEnd(14)} ${p.project.padEnd(22)} ${p.chain.padEnd(16)} ` +
          `tvl=${Math.round(p.tvlUsd ?? 0)} apy=${p.apy} ${p.pool}`,
      );
    }
  }
}

async function runLiquidity(): Promise<boolean> {
  const file = path.join(SNAPSHOT_DIR, "liquidity.json");
  let previous: LiquidityFile | null = null;
  try {
    previous = JSON.parse(fs.readFileSync(file, "utf8")) as LiquidityFile;
  } catch {
    // First run: nothing to carry forward.
  }
  try {
    const result = await fetchLiquidity(previous);
    fs.writeFileSync(file, JSON.stringify(result, null, 1) + "\n");
    const bad = Object.entries(result.sources).filter(([, v]) => !v.ok).map(([k, v]) => `${k}: ${v.error}`);
    console.log(
      `[liquidity] ${result.pools.length} active pools ` +
        `(sources: ${Object.entries(result.sources).map(([k, v]) => `${k} ${v.ok ? "ok" : "FAILED"} ${v.count}`).join(", ")}; ` +
        `excluded: ${result.excluded.inactive} inactive, ${result.excluded.belowTvl} under $10k, ${result.excluded.otherVenues} on other venues)`,
    );
    for (const b of bad) console.error(`  ${b} — kept the previous run's pools for it`);
    return true;
  } catch (err) {
    console.error(`[liquidity] FAILED: ${err}. Keeping the previous liquidity file.`);
    return false;
  }
}

main();
