import fs from "node:fs";
import path from "node:path";
import { readJsonCached } from "./fileCache";
import type { Snapshot, SnapshotFile } from "./types";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");
const LATEST = path.join(SNAPSHOT_DIR, "latest.json");

/**
 * Reads the last committed snapshot. Returns null when there is none, so the
 * site still builds from seed data alone (and on a fetcher outage).
 */
export function loadLatestSnapshot(): SnapshotFile | null {
  return readJsonCached<SnapshotFile>(LATEST);
}

export function snapshotsById(): Map<string, Snapshot> {
  const file = loadLatestSnapshot();
  const map = new Map<string, Snapshot>();
  for (const snap of file?.snapshots ?? []) map.set(snap.opportunityId, snap);
  return map;
}

/** Archived snapshot files, oldest first. Powers the history charts. */
export function listArchivedSnapshots(): string[] {
  try {
    return fs
      .readdirSync(SNAPSHOT_DIR)
      .filter((f) => f.endsWith(".json") && f !== "latest.json")
      .sort();
  } catch {
    return [];
  }
}

export function loadHistory(opportunityId: string): Snapshot[] {
  return listArchivedSnapshots()
    .map((name) => {
      try {
        const file = JSON.parse(
          fs.readFileSync(path.join(SNAPSHOT_DIR, name), "utf8"),
        ) as SnapshotFile;
        return file.snapshots.find((s) => s.opportunityId === opportunityId) ?? null;
      } catch {
        return null;
      }
    })
    .filter((s): s is Snapshot => s !== null);
}
