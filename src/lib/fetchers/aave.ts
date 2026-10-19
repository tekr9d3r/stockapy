import { loadSeed } from "@/lib/data/seed";
import type { Snapshot } from "@/lib/data/types";

const ENDPOINT = "https://api.v4.aave.com/graphql";

/** Chains we query. Aave's API takes numeric ids, our seed uses names. */
const CHAIN_IDS: Record<string, number> = {
  Ethereum: 1,
  Base: 8453,
  Arbitrum: 42161,
};

/**
 * PercentNumber carries the same figure twice: `value` is a fraction (0.79) and
 * `normalized` is the percentage (79). We take LTV as a fraction and rates as
 * percentages, so each field reads the one that matches.
 */
type PercentNumber = { value: string; normalized: string };

type AaveReserve = {
  asset: { underlying: { info: { symbol: string } | null } };
  canBorrow: boolean;
  canUseAsCollateral: boolean;
  settings: {
    collateralFactor: PercentNumber;
    maxLiquidationBonus: PercentNumber;
    collateral: boolean;
  };
  summary: { supplyApy: PercentNumber; borrowApy: PercentNumber };
  spoke: { name: string } | null;
};

const QUERY = `query Reserves($chainIds: [ChainId!]) {
  reserves(request: { query: { chainIds: $chainIds }, filter: ALL, orderBy: { collateralFactor: DESC } }) {
    asset { underlying { info { symbol } } }
    canBorrow
    canUseAsCollateral
    settings {
      collateralFactor { value normalized }
      maxLiquidationBonus { value normalized }
      collateral
    }
    summary { supplyApy { value normalized } borrowApy { value normalized } }
    spoke { name }
  }
}`;

async function queryReserves(chainIds: number[]): Promise<AaveReserve[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { chainIds } }),
  });
  if (!res.ok) throw new Error(`Aave API responded ${res.status}`);

  const body = (await res.json()) as { data?: { reserves: AaveReserve[] }; errors?: unknown[] };
  if (body.errors?.length) throw new Error(`Aave API: ${JSON.stringify(body.errors).slice(0, 300)}`);
  if (!body.data?.reserves) throw new Error("Aave API returned no reserves");

  return body.data.reserves;
}

const num = (v: string | undefined | null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Aave V4 reserves, keyed in the seed by `external_id` = the reserve symbol.
 * Covers the equity spokes that DefiLlama does not index at all.
 */
export async function fetchAave(): Promise<Snapshot[]> {
  const opportunities = loadSeed().opportunities.filter(
    (o) => o.data_source === "aave_api" && o.external_id,
  );
  if (opportunities.length === 0) return [];

  const chains = [...new Set(opportunities.map((o) => o.chain))];
  const chainIds = chains.map((c) => CHAIN_IDS[c]).filter((id): id is number => id !== undefined);
  const unknown = chains.filter((c) => CHAIN_IDS[c] === undefined);
  if (unknown.length > 0) console.warn(`[aave] no chain id mapped for: ${unknown.join(", ")}`);
  if (chainIds.length === 0) return [];

  const reserves = await queryReserves(chainIds);
  const bySymbol = new Map<string, AaveReserve>();
  for (const r of reserves) {
    const symbol = r.asset.underlying.info?.symbol;
    if (symbol) bySymbol.set(symbol, r);
  }

  const fetchedAt = new Date().toISOString();
  const snapshots: Snapshot[] = [];
  const missing: string[] = [];

  for (const opp of opportunities) {
    const reserve = bySymbol.get(opp.external_id!);
    if (!reserve) {
      missing.push(`${opp.id} (${opp.external_id})`);
      continue;
    }

    // The loan leg is a different reserve in the same spoke: the equities
    // themselves are not borrowable, only usable as collateral.
    const loan = opp.borrow ? bySymbol.get(opp.borrow.loan_asset) : undefined;
    if (opp.borrow && !loan) {
      console.warn(`[aave] ${opp.id}: no reserve for loan asset ${opp.borrow.loan_asset}`);
    }

    const supplyApy = num(reserve.summary.supplyApy.normalized);

    snapshots.push({
      opportunityId: opp.id,
      apyTotal: supplyApy,
      // Aave pays supply interest, never token incentives on these reserves, so a
      // measured supply APY is entirely base.
      apyBase: supplyApy,
      apyReward: supplyApy === null ? null : 0,
      tvlUsd: null,
      ltv: reserve.canUseAsCollateral ? num(reserve.settings.collateralFactor.value) : null,
      borrowApr: loan ? num(loan.summary.borrowApy.normalized) : null,
      source: "aave_api",
      fetchedAt,
    });
  }

  if (missing.length > 0) {
    console.warn(`[aave] ${missing.length} seeded reserve(s) not found:\n  ${missing.join("\n  ")}`);
  }

  return snapshots;
}
