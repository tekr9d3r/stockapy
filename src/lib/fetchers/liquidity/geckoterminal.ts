import { classifyPoolType, legsFromTokens, parseFeeTier, type RegistryToken } from "@/lib/liquidity/classify";
import { grossFeeApy } from "@/lib/liquidity/fees";
import { EVM_CHAINS, depositUrl, poolChartUrl, venueForDex } from "@/lib/liquidity/venues";
import type { LiquidityPool } from "@/lib/liquidity/types";

/**
 * Uniswap pools, from GeckoTerminal (CoinGecko's on-chain DEX index). Aero pools
 * are read from Aero's Sugar contract instead (./aero.ts).
 *
 * Why not Uniswap's own API: its documented data path is its subgraphs on The
 * Graph, which need an API key. GeckoTerminal is free, reads the chain directly,
 * and gives each pool's own address, so we can link to the exact deposit page.
 */
const API = "https://api.geckoterminal.com/api/v2";
/**
 * The free tier allows 30 requests a minute. Run at 20 so an hourly job never
 * brushes the limit: ~35 tokens take a couple of minutes, which is fine.
 */
const SPACING_MS = 3_000;
const MAX_RETRIES = 3;

type GeckoPool = {
  attributes: { address: string; name: string; reserve_in_usd: string | null; volume_usd: { h24: string | null } };
  relationships: {
    dex: { data: { id: string } };
    base_token: { data: { id: string } };
    quote_token: { data: { id: string } };
  };
};
type GeckoToken = { id: string; attributes: { address: string; symbol: string } };

async function getJson(url: string, attempt = 0): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (res.status === 429 && attempt < MAX_RETRIES) {
    // Respect Retry-After when given; otherwise wait out a full rate window.
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60_000;
    await new Promise((r) => setTimeout(r, waitMs));
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`GeckoTerminal responded ${res.status}`);
  return res.json();
}

const FEE_NOTE =
  "Computed from 24h volume × fee tier. Before any Uniswap protocol fee, which applies to " +
  "some pools and is not deducted here.";

export async function fetchGeckoTerminal(
  registry: RegistryToken[],
  index: Map<string, RegistryToken>,
  fetchedAt: string,
): Promise<{ pools: LiquidityPool[]; otherVenues: number }> {
  const tokens = registry.filter((t) => EVM_CHAINS[t.chain]);
  const seen = new Map<string, { chain: string; pool: GeckoPool; symbols: Map<string, GeckoToken> }>();
  let otherVenues = 0;

  for (const token of tokens) {
    const net = EVM_CHAINS[token.chain].gecko;
    const url =
      `${API}/networks/${net}/tokens/${token.address}/pools` +
      `?include=base_token,quote_token&sort=h24_volume_usd_desc&page=1`;
    const body = (await getJson(url)) as { data?: GeckoPool[]; included?: GeckoToken[] };
    const symbols = new Map((body.included ?? []).map((t) => [t.id, t]));
    for (const pool of body.data ?? []) {
      const dexId = pool.relationships.dex.data.id;
      // Aero pools come from Aero's own Sugar contract instead.
      if (/^aero-/.test(dexId)) continue;
      if (!venueForDex(dexId)) {
        otherVenues++;
        continue;
      }
      seen.set(`${token.chain}:${pool.attributes.address.toLowerCase()}`, { chain: token.chain, pool, symbols });
    }
    await new Promise((r) => setTimeout(r, SPACING_MS));
  }

  const pools: LiquidityPool[] = [];
  for (const { chain, pool, symbols } of seen.values()) {
    const v = venueForDex(pool.relationships.dex.data.id)!;
    const venue = v.venue;
    const legTokens = [pool.relationships.base_token.data.id, pool.relationships.quote_token.data.id].map((id) => {
      const t = symbols.get(id);
      return { address: t?.attributes.address ?? id.split("_").pop()!, symbol: t?.attributes.symbol ?? "?" };
    });
    const built = legsFromTokens(chain, legTokens, index);
    if (!built) continue;

    const tvl = Number(pool.attributes.reserve_in_usd ?? 0);
    const volume = Number(pool.attributes.volume_usd.h24 ?? 0);
    const feeTier = parseFeeTier(pool.attributes.name);
    const gross = grossFeeApy(feeTier, volume, tvl);
    const dexId = pool.relationships.dex.data.id;
    // Uniswap v2 spreads liquidity over every price; v3 and v4 are concentrated.
    const poolType = classifyPoolType(/^uniswap-v2/.test(dexId) ? "uniswap-v2" : "uniswap-v3", null);

    pools.push({
      id: `${venue}:${chain}:${pool.attributes.address.toLowerCase()}`,
      address: pool.attributes.address,
      venueId: venue,
      variant: v.variant,
      chain,
      symbol: legTokens.map((t) => t.symbol).join(" / "),
      legs: built.legs.map((l) => ({
        symbol: l.symbol,
        address: l.address,
        stock: l.stock ? { symbol: l.stock.symbol, underlying: l.stock.underlying, issuer: l.stock.issuer } : null,
      })),
      underlyings: [...new Set(built.stockLegs.map((s) => s.underlying))],
      issuers: [...new Set(built.stockLegs.map((s) => s.issuer))],
      pairType: built.pairType,
      poolType,
      feeTier,
      apyBase: gross,
      apyBaseGross: gross,
      lpFeeShare: null,
      apyReward: null,
      apyBase7d: null,
      tvlUsd: tvl,
      volumeUsd1d: volume,
      volumeUsd7d: null,
      feeNote: FEE_NOTE,
      url: depositUrl(venue, chain, pool.attributes.address),
      chartUrl: poolChartUrl(chain, pool.attributes.address),
      source: "geckoterminal",
      fetchedAt,
    });
  }
  return { pools, otherVenues };
}
