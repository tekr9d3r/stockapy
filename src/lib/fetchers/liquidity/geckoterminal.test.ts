import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectDue, type PoolIndex } from "./geckoterminal";

const HOUR = 3_600_000;
const now = Date.parse("2026-10-23T12:00:00Z");
const at = (hoursAgo: number) => ({ checkedAt: new Date(now - hoursAgo * HOUR).toISOString(), pools: [], otherVenues: 0 });

describe("selectDue: which tokens get their pools looked up this run", () => {
  const index: PoolIndex = { tokens: { a: at(1), b: at(7), c: at(30) } };

  it("skips tokens looked up within the last 6 hours", () => {
    assert.deepEqual(selectDue(["a"], index, now), []);
  });
  it("puts never-seen tokens first, then the stalest", () => {
    assert.deepEqual(selectDue(["a", "b", "c", "new"], index, now), ["new", "c", "b"]);
  });
  it("respects the per-run cap", () => {
    assert.deepEqual(selectDue(["a", "b", "c", "new"], index, now, 2), ["new", "c"]);
  });
});
