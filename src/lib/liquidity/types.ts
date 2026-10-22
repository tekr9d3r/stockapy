import type { PairType, PoolType } from "./classify";
import type { VenueId } from "./venues";

export type LiquidityLeg = {
  symbol: string;
  address: string | null;
  /** Present when this leg is a verified tokenized stock. */
  stock: { symbol: string; underlying: string; issuer: string } | null;
};

/** One active liquidity pool, as stored in data/snapshots/liquidity.json. */
export type LiquidityPool = {
  /** `${venue}:${chain}:${address}` — unique across venues. */
  id: string;
  /** The pool's own address on its chain. */
  address: string;
  venueId: VenueId;
  /** e.g. "v3", "Concentrated", "CL10". */
  variant: string | null;
  chain: string;
  symbol: string;
  legs: LiquidityLeg[];
  underlyings: string[];
  issuers: string[];
  pairType: PairType;
  poolType: PoolType;
  /** Percent per swap, e.g. 0.3. */
  feeTier: number | null;
  /**
   * Fee APY that reaches a liquidity provider. Null when the venue does not say
   * what share of fees LPs keep (Aero), rather than guessed.
   */
  apyBase: number | null;
  /** Fees the pool generates per year as a share of TVL, before anyone's cut. */
  apyBaseGross: number | null;
  /** Fraction of fees LPs keep, when the venue publishes it. */
  lpFeeShare: number | null;
  /** Incentives on top. Null when none are published. */
  apyReward: number | null;
  /** Fee APY to LPs over 7 days, where the source provides it. */
  apyBase7d: number | null;
  tvlUsd: number;
  volumeUsd1d: number;
  volumeUsd7d: number | null;
  /**
   * Hours of trading behind volumeUsd1d and the fee APY, when fewer than 24 because
   * the pool is newer than a day. Absent when the figures cover a full day.
   */
  volumeWindowHours?: number | null;
  /**
   * Venue emissions paid to LPs who stake in the gauge (Aero). Kept apart from
   * apyReward because staking forfeits the trading fees: it is fees or this,
   * never both.
   */
  emissions?: LiquidityEmissions | null;
  /** How apyBase was derived, or why it is missing. Shown beside the figure. */
  feeNote: string;
  /** The page where you deposit into this exact pool. */
  url: string;
  /** Independent page for the exact pool. */
  chartUrl: string;
  source: LiquiditySource;
  fetchedAt: string;
};

export type LiquiditySource = "raydium-api" | "geckoterminal" | "aero-sugar";

export type LiquidityEmissions = {
  token: string;
  /** Emissions to the pool's gauge, in USD per day at the current token price. */
  usdPerDay: number;
  /** USD value of liquidity staked in the gauge, which shares those emissions. */
  stakedUsd: number;
  /**
   * The venue's own APR: a year of emissions over stakedUsd. Huge when little is
   * staked, and falls as soon as more LPs stake. Null when nothing is staked.
   */
  venueApr: number | null;
};

export type ReviewPool = { venue: string; chain: string; symbol: string; address: string; reason: string };

export type LiquidityFile = {
  fetchedAt: string;
  sources: Record<string, { ok: boolean; count: number; error?: string }>;
  pools: LiquidityPool[];
  /** Pools seen but not listed, with the reason. */
  excluded: { inactive: number; belowTvl: number; otherVenues: number };
  review: ReviewPool[];
};
