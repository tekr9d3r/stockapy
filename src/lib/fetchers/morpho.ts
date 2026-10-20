import { loadSeed } from "@/lib/data/seed";
import type { Snapshot } from "@/lib/data/types";

const ENDPOINT = "https://api.morpho.org/graphql";

/**
 * Morpho Blue markets, keyed by market id.
 *
 * The important subtlety: in a Morpho Blue market the supplier deposits the
 * LOAN asset, and the collateral is never lent out. Morpho's own docs put it
 * plainly — "lenders deposit loan assets into a specific market to earn
 * interest" — so `supplyApy` is the rate for supplying USDC/USDG/AUSD, NOT a
 * yield on the tokenized stock posted as collateral. We record it as the lend
 * side of the market and keep the stock's own APY at zero, which is what it is.
 */
type MorphoMarket = {
  marketId: string;
  lltv: string;
  loanAsset: { symbol: string };
  collateralAsset: { symbol: string } | null;
  state: {
    supplyApy: number | null;
    borrowApy: number | null;
    collateralAssetsUsd: number | null;
    liquidityAssetsUsd: number | null;
  } | null;
};

const QUERY = `query Markets($ids: [String!]) {
  markets(first: 200, where: { uniqueKey_in: $ids }) {
    items {
      marketId
      lltv
      loanAsset { symbol }
      collateralAsset { symbol }
      state { supplyApy borrowApy collateralAssetsUsd liquidityAssetsUsd }
    }
  }
}`;

export async function fetchMorpho(): Promise<Snapshot[]> {
  const opportunities = loadSeed().opportunities.filter(
    (o) => o.data_source === "morpho_api" && o.external_id,
  );
  if (opportunities.length === 0) return [];

  const ids = opportunities.map((o) => o.external_id!);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { ids } }),
  });
  if (!res.ok) throw new Error(`Morpho API responded ${res.status}`);

  const body = (await res.json()) as {
    data?: { markets: { items: MorphoMarket[] } };
    errors?: unknown[];
  };
  if (body.errors?.length) {
    throw new Error(`Morpho API: ${JSON.stringify(body.errors).slice(0, 300)}`);
  }
  const items = body.data?.markets?.items;
  if (!items) throw new Error("Morpho API returned no markets");

  const byId = new Map(items.map((m) => [m.marketId.toLowerCase(), m]));
  const fetchedAt = new Date().toISOString();
  const snapshots: Snapshot[] = [];
  const missing: string[] = [];

  for (const opp of opportunities) {
    const market = byId.get(opp.external_id!.toLowerCase());
    if (!market) {
      missing.push(`${opp.id} (${opp.external_id})`);
      continue;
    }
    const state = market.state;
    const pct = (v: number | null | undefined) => (v == null ? null : v * 100);

    snapshots.push({
      opportunityId: opp.id,
      // The stock itself earns nothing here; Morpho Blue does not lend collateral out.
      apyTotal: 0,
      apyBase: 0,
      apyReward: 0,
      tvlUsd: state?.collateralAssetsUsd ?? null,
      ltv: Number(market.lltv) / 1e18 || null,
      borrowApr: pct(state?.borrowApy ?? null),
      lendApy: pct(state?.supplyApy ?? null),
      source: "morpho_api",
      fetchedAt,
    });
  }

  if (missing.length > 0) {
    console.warn(`[morpho] ${missing.length} market(s) not found:\n  ${missing.join("\n  ")}`);
  }
  return snapshots;
}
