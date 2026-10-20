/**
 * Runs every fetcher and writes data/snapshots/latest.json plus an hourly archive.
 *
 * Each source is isolated: one failing API must not empty the others. On a total
 * failure nothing is written, so the site keeps serving the last good snapshot.
 *
 *   npx tsx scripts/run-fetchers.ts            fetch and write
 *   npx tsx scripts/run-fetchers.ts --discover also list unseeded equity pools
 */
import fs from "node:fs";
import path from "node:path";
import { fetchAave } from "../src/lib/fetchers/aave";
import { fetchMorpho } from "../src/lib/fetchers/morpho";
import { fetchDefiLlama, findUnseededPools } from "../src/lib/fetchers/defillama";
import type { Snapshot, SnapshotFile } from "../src/lib/data/types";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

const SOURCES: Record<string, () => Promise<Snapshot[]>> = {
  defillama: fetchDefiLlama,
  aave: fetchAave,
  morpho: fetchMorpho,
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

  if (snapshots.length === 0) {
    console.error("No source returned anything. Keeping the previous snapshot.");
    process.exit(1);
  }

  const file: SnapshotFile = { fetchedAt, sources, snapshots };
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  fs.writeFileSync(path.join(SNAPSHOT_DIR, "latest.json"), JSON.stringify(file, null, 2) + "\n");

  const stamp = fetchedAt.slice(0, 13).replace(/[:T]/g, "-");
  fs.writeFileSync(
    path.join(SNAPSHOT_DIR, `${stamp}.json`),
    JSON.stringify(file, null, 2) + "\n",
  );
  console.log(`Wrote latest.json and ${stamp}.json (${snapshots.length} snapshots)`);

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

main();
