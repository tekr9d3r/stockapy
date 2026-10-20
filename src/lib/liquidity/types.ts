import type { PairType, PoolType } from "./classify";

export type LiquidityLeg = {
  symbol: string;
  address: string | null;
  /** Present when this leg is a verified tokenized stock. */
  stock: { symbol: string; underlying: string; issuer: string } | null;
};

/** One liquidity pool as stored in data/snapshots/liquidity.json. */
export type LiquidityPool = {
  /** DefiLlama pool id. */
  id: string;
  /** DefiLlama project slug, e.g. uniswap-v3. */
  project: string;
  venueId: string;
  chain: string;
  symbol: string;
  legs: LiquidityLeg[];
  underlyings: string[];
  issuers: string[];
  pairType: PairType;
  poolType: PoolType;
  /** Percent, e.g. 0.3. Null when the venue does not report one. */
  feeTier: number | null;
  /** Trading fees paid by traders. The real yield in this category. */
  apyBase: number | null;
  /** Token incentives on top. */
  apyReward: number | null;
  apyBase7d: number | null;
  tvlUsd: number | null;
  volumeUsd1d: number | null;
  volumeUsd7d: number | null;
  ilRisk: string | null;
  matchedBy: "address" | "symbol";
  source: "defillama";
  fetchedAt: string;
  firstSeen: string;
  status: "live" | "ended";
  endedOn: string | null;
};

export type SkippedPool = { id: string; project: string; chain: string; symbol: string; reason: string };
export type ReviewPool = SkippedPool & { tvlUsd: number | null };

export type LiquidityFile = {
  fetchedAt: string;
  pools: LiquidityPool[];
  /** Matched a stock but deliberately not listed. */
  skipped: SkippedPool[];
  /** Looked like a stock pair but did not match the registry: for a human. */
  review: ReviewPool[];
};
