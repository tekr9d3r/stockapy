import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENDPOINTS, MAX_LIMIT, filterBorrow, filterEarn, filterLiquidity, parseQuery } from "./query";
import type { LiquidityItem, OpportunityItem } from "./serialize";

const q = (s: string, ep: keyof typeof ENDPOINTS) => parseQuery(new URLSearchParams(s), ENDPOINTS[ep]);

const earn = (over: Partial<OpportunityItem>): OpportunityItem =>
  ({ category: "earn", status: "live", underlyingTicker: "NVDA", chain: "Base", platform: "Aave", apyTotal: 1, tvlUsd: 1000, borrow: null, ...over }) as OpportunityItem;

const pool = (over: Partial<LiquidityItem>): LiquidityItem =>
  ({ pairType: "stock-stable", underlyingTickers: ["NVDA"], chain: "Solana", venue: "Raydium", tvlUsd: 100_000, apyBase: 10, volumeUsd1d: 5000, ...over }) as LiquidityItem;

describe("parseQuery", () => {
  it("applies defaults", () => {
    const r = q("", "earn");
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.q.sort, "apy");
      assert.equal(r.q.status, "live");
      assert.equal(r.q.limit, 100);
    }
  });
  it("rejects unknown parameters, naming the allowed ones", () => {
    const r = q("tikcer=nvda", "earn");
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /Unknown parameter "tikcer".*ticker/);
  });
  it("rejects a sort the endpoint does not offer", () => {
    assert.equal(q("sort=fee", "earn").ok, false);
    assert.equal(q("sort=fee", "liquidity").ok, true);
  });
  it("rejects bad numbers and caps the limit", () => {
    assert.equal(q("min_tvl=-5", "earn").ok, false);
    assert.equal(q("min_tvl=abc", "earn").ok, false);
    assert.equal(q("limit=0", "earn").ok, false);
    assert.equal(q("limit=2.5", "earn").ok, false);
    const r = q("limit=99999", "earn");
    assert.ok(r.ok && r.q.limit === MAX_LIMIT);
  });
});

describe("filters", () => {
  it("matches tickers case-insensitively and sorts by APY", () => {
    const r = q("ticker=nvda", "earn");
    assert.ok(r.ok);
    if (!r.ok) return;
    const out = filterEarn([earn({ apyTotal: 1 }), earn({ apyTotal: 5 }), earn({ underlyingTicker: "TSLA" })], r.q);
    assert.deepEqual(out.map((i) => i.apyTotal), [5, 1]);
  });
  it("leaves ended programmes out unless asked", () => {
    const items = [earn({}), earn({ status: "ended" })];
    const live = q("", "earn");
    const all = q("status=all", "earn");
    assert.ok(live.ok && all.ok);
    if (live.ok && all.ok) {
      assert.equal(filterEarn(items, live.q).length, 1);
      assert.equal(filterEarn(items, all.q).length, 2);
    }
  });
  it("treats BSC and BNB Chain as one chain", () => {
    const r = q("chain=bnb chain", "liquidity");
    assert.ok(r.ok);
    if (r.ok) assert.equal(filterLiquidity([pool({ chain: "BSC" })], r.q).length, 1);
  });
  it("filters liquidity by TVL floor and pair type", () => {
    const r = q("min_tvl=50000", "liquidity");
    assert.ok(r.ok);
    if (!r.ok) return;
    const out = filterLiquidity([pool({ tvlUsd: 10_000 }), pool({}), pool({ pairType: "stock-other" })], r.q);
    assert.equal(out.length, 1);
  });
  it("puts pools with no fee figure last, even among several", () => {
    const r = q("sort=fee", "liquidity");
    assert.ok(r.ok);
    if (!r.ok) return;
    const out = filterLiquidity([pool({ apyBase: null }), pool({ apyBase: 3 }), pool({ apyBase: null }), pool({ apyBase: 9 })], r.q);
    assert.deepEqual(out.map((i) => i.apyBase), [9, 3, null, null]);
  });
  it("sorts borrow markets by cheapest loan", () => {
    const r = q("sort=cost", "borrow");
    assert.ok(r.ok);
    if (!r.ok) return;
    const b = (apr: number) => earn({ category: "collateral", borrow: { loanAsset: "USDC", maxLtv: 0.7, borrowApr: apr, lendApy: null } });
    assert.deepEqual(filterBorrow([b(6), b(2), b(4)], r.q).map((i) => i.borrow!.borrowApr), [2, 4, 6]);
  });
});
