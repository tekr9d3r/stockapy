export type AssetType = "stock" | "etf";
export type PlatformKind = "defi" | "cefi";
export type Category = "earn" | "collateral" | "structured";
export type Lockup = "none" | "days" | "fixed_term";
export type DataSource = "defillama" | "onchain" | "bybit_api" | "kraken_api" | "manual";

export type UnderlyingAsset = {
  ticker: string;
  name: string;
  type: AssetType;
};

export type Issuer = {
  id: string;
  name: string;
  website: string;
  structure_note: string;
};

export type Platform = {
  id: string;
  name: string;
  kind: PlatformKind;
  website: string;
  description: string;
};

export type Token = {
  symbol: string;
  underlying: string;
  issuer: string;
  chain: string;
  contract_address?: string | null;
  note?: string;
};

/** A rate we typed in by hand because no API covers it. */
export type ManualRate = {
  apy_base: number | null;
  apy_reward: number | null;
  apy_total: number | null;
  tvl_usd: number | null;
  points_label?: string | null;
  checked_at: string;
  note?: string;
};

export type Opportunity = {
  id: string;
  token: string;
  platform: string;
  chain: string;
  category: Category;
  variant?: string;
  url: string;
  verified: boolean;
  lockup: Lockup;
  withdrawal_delay_days?: number;
  eligibility_note?: string;
  risk_notes?: string;
  data_source: DataSource;
  external_id?: string;
  manual?: ManualRate;
  active: boolean;
};

export type WatchlistEntry = {
  platform: string;
  chain: string;
  status: string;
  note: string;
  url: string;
};

export type Seed = {
  underlying_assets: UnderlyingAsset[];
  issuers: Issuer[];
  platforms: Platform[];
  tokens: Token[];
  opportunities: Opportunity[];
  watchlist: WatchlistEntry[];
};

/** One measurement of one opportunity at one point in time. */
export type Snapshot = {
  opportunityId: string;
  apyTotal: number | null;
  apyBase: number | null;
  apyReward: number | null;
  pointsLabel?: string | null;
  tvlUsd: number | null;
  source: string;
  fetchedAt: string;
};

/** What a fetcher run writes to data/snapshots/*.json. */
export type SnapshotFile = {
  fetchedAt: string;
  sources: Record<string, { ok: boolean; count: number; error?: string }>;
  snapshots: Snapshot[];
};

/** A seed row joined to its latest measurement — what the UI renders. */
export type Row = {
  id: string;
  underlying: UnderlyingAsset;
  token: Token;
  issuer: Issuer;
  platform: Platform;
  chain: string;
  category: Category;
  variant?: string;
  apyTotal: number | null;
  apyBase: number | null;
  apyReward: number | null;
  pointsLabel: string | null;
  tvlUsd: number | null;
  lockup: Lockup;
  withdrawalDelayDays?: number;
  url: string;
  verified: boolean;
  eligibilityNote?: string;
  riskNotes?: string;
  source: string;
  fetchedAt: string | null;
  /** True when we have no number at all, as opposed to a measured zero. */
  unmeasured: boolean;
  /** True when the measurement is older than twice the refresh interval. */
  stale: boolean;
};
