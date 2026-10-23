import fs from "node:fs";
import path from "node:path";
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
 * The free API documents 30 requests a minute, but in practice (measured
 * 2026-10-23) it allows about 5-6 before answering 429 with a 60-second
 * penalty. Pacing at 5 a minute avoids the penalties, which cost far more.
 */
const SPACING_MS = 12_000;
const MAX_RETRIES = 4;

type GeckoPool = {
  id?: string;
  attributes: { address: string; name: string; reserve_in_usd: string | null; volume_usd: { h24: string | null } };
  relationships: {
    dex: { data: { id: string } };
    base_token: { data: { id: string } };
    quote_token: { data: { id: string } };
  };
};
type GeckoToken = { id: string; attributes: { address: string; symbol: string } };
type GeckoTokenWithPools = { attributes: { address: string }; relationships?: { top_pools?: { data: { id: string }[] } } };

async function getJson(url: string, attempt = 0): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" } }).catch(() => null);
  if (res?.ok) return res.json();
  const status = res?.status ?? 0;
  // Rate limits and the occasional 5xx are transient: back off and try again.
  if ((status === 429 || status >= 500 || status === 0) && attempt < MAX_RETRIES) {
    const retryAfter = Number(res?.headers.get("retry-after"));
    const waitMs =
      status === 429 ? (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60_000) : 10_000 * (attempt + 1);
    await new Promise((r) => setTimeout(r, waitMs));
    return getJson(url, attempt + 1);
  }
  throw new Error(`GeckoTerminal responded ${status || "no response"}`);
}

const FEE_NOTE =
  "Computed from 24h volume × fee tier. Before any Uniswap protocol fee, which applies to " +
  "some pools and is not deducted here.";

/**
 * Which pools hold each token. Every run asks for each token's top pool, 30
 * tokens per request, so a new major pool shows up at once. A full lookup of
 * all of a token's pools costs one request per token, so it runs in rotation:
 * a token is looked up again once its entry is older than REFRESH_MS, at most
 * MAX_LOOKUPS_PER_RUN per run. Live numbers are then fetched for every known
 * pool, 30 per request. A run costs a few dozen requests however many tokens
 * the registry holds, and one failed request only skips its own batch.
 */
export const POOL_INDEX_FILE = path.join(process.cwd(), "data", "snapshots", "pool-index.json");
const REFRESH_MS = 6 * 60 * 60 * 1000;
/** Override with POOL_LOOKUPS=n, e.g. to build the index from scratch in one go. */
const MAX_LOOKUPS_PER_RUN = Number(process.env.POOL_LOOKUPS) || 6;
const BATCH = 30;

export type PoolIndex = {
  tokens: Record<string, { checkedAt: string; pools: string[]; otherVenues: number }>;
};

/** Tokens to look up this run: never looked up first, then the stalest, capped. */
export function selectDue(keys: string[], index: PoolIndex, now: number, max = MAX_LOOKUPS_PER_RUN): string[] {
  const age = (k: string) => {
    const e = index.tokens[k];
    return e ? now - Date.parse(e.checkedAt) : Infinity;
  };
  return keys
    .filter((k) => age(k) >= REFRESH_MS)
    .sort((a, b) => age(b) - age(a))
    .slice(0, max);
}

function loadIndex(): PoolIndex {
  try {
    return JSON.parse(fs.readFileSync(POOL_INDEX_FILE, "utf8")) as PoolIndex;
  } catch {
    return { tokens: {} };
  }
}

const tokenKey = (t: RegistryToken) => `${t.chain}:${t.address.toLowerCase()}`;

export async function fetchGeckoTerminal(
  registry: RegistryToken[],
  index: Map<string, RegistryToken>,
  fetchedAt: string,
): Promise<{ pools: LiquidityPool[]; otherVenues: number }> {
  const tokens = registry.filter((t) => EVM_CHAINS[t.chain]);
  const byKey = new Map(tokens.map((t) => [tokenKey(t), t]));
  const poolIndex = loadIndex();
  // Forget tokens that left the registry.
  for (const k of Object.keys(poolIndex.tokens)) if (!byKey.has(k)) delete poolIndex.tokens[k];

  const keep = (key: string, dexId: string, address: string, entry: { pools: string[]; otherVenues: number }) => {
    // Aero pools come from Aero's own Sugar contract instead.
    if (/^aero-/.test(dexId)) return;
    if (!venueForDex(dexId)) {
      entry.otherVenues++;
      return;
    }
    const a = address.toLowerCase();
    if (!entry.pools.includes(a)) entry.pools.push(a);
  };

  // 0. Each token's top pool, 30 tokens per request.
  const chains = [...new Set(tokens.map((t) => t.chain))];
  for (const chain of chains) {
    const list = tokens.filter((t) => t.chain === chain);
    for (let i = 0; i < list.length; i += BATCH) {
      const chunk = list.slice(i, i + BATCH);
      try {
        const body = (await getJson(
          `${API}/networks/${EVM_CHAINS[chain].gecko}/tokens/multi/${chunk.map((t) => t.address).join(",")}?include=top_pools`,
        )) as { data?: GeckoTokenWithPools[]; included?: GeckoPool[] };
        const poolsById = new Map((body.included ?? []).map((p) => [`${p.id}`, p]));
        for (const t of body.data ?? []) {
          const key = `${chain}:${t.attributes.address.toLowerCase()}`;
          if (!byKey.has(key)) continue;
          const entry = poolIndex.tokens[key] ?? { checkedAt: new Date(0).toISOString(), pools: [], otherVenues: 0 };
          for (const ref of t.relationships?.top_pools?.data ?? []) {
            const p = poolsById.get(ref.id);
            if (p) keep(key, p.relationships.dex.data.id, p.attributes.address, { ...entry, otherVenues: 0 });
          }
          poolIndex.tokens[key] = entry;
        }
      } catch (err) {
        console.warn(`[geckoterminal] top pools for ${chain} batch ${i / BATCH + 1} skipped: ${err}`);
      }
      await new Promise((r) => setTimeout(r, SPACING_MS));
    }
  }

  // 1. Full lookups for the stalest tokens, in rotation.
  for (const key of selectDue([...byKey.keys()], poolIndex, Date.parse(fetchedAt))) {
    const token = byKey.get(key)!;
    try {
      const body = (await getJson(
        `${API}/networks/${EVM_CHAINS[token.chain].gecko}/tokens/${token.address}/pools?sort=h24_volume_usd_desc&page=1`,
      )) as { data?: GeckoPool[] };
      const entry = { checkedAt: fetchedAt, pools: [] as string[], otherVenues: 0 };
      for (const pool of body.data ?? []) keep(key, pool.relationships.dex.data.id, pool.attributes.address, entry);
      poolIndex.tokens[key] = entry;
    } catch (err) {
      console.warn(`[geckoterminal] pool lookup for ${token.symbol} skipped: ${err}`);
    }
    await new Promise((r) => setTimeout(r, SPACING_MS));
  }
  fs.writeFileSync(POOL_INDEX_FILE, JSON.stringify(poolIndex) + "\n");

  // 2. Live numbers for every known pool, 30 per request.
  const byChain = new Map<string, Set<string>>();
  for (const [key, e] of Object.entries(poolIndex.tokens)) {
    const chain = byKey.get(key)!.chain;
    const set = byChain.get(chain) ?? new Set<string>();
    e.pools.forEach((p) => set.add(p));
    byChain.set(chain, set);
  }
  const seen = new Map<string, { chain: string; pool: GeckoPool; symbols: Map<string, GeckoToken> }>();
  for (const [chain, set] of byChain) {
    const all = [...set];
    for (let i = 0; i < all.length; i += BATCH) {
      const ids = all.slice(i, i + BATCH).join(",");
      try {
        const body = (await getJson(
          `${API}/networks/${EVM_CHAINS[chain].gecko}/pools/multi/${ids}?include=base_token,quote_token,dex`,
        )) as { data?: GeckoPool[]; included?: GeckoToken[] };
        const symbols = new Map((body.included ?? []).map((t) => [t.id, t]));
        for (const pool of body.data ?? []) {
          if (!venueForDex(pool.relationships.dex.data.id)) continue;
          seen.set(`${chain}:${pool.attributes.address.toLowerCase()}`, { chain, pool, symbols });
        }
      } catch (err) {
        console.warn(`[geckoterminal] live numbers for ${chain} batch ${i / BATCH + 1} skipped: ${err}`);
      }
      await new Promise((r) => setTimeout(r, SPACING_MS));
    }
  }
  const otherVenues = Object.values(poolIndex.tokens).reduce((s, e) => s + e.otherVenues, 0);

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
