import { classifyPoolType, legsFromTokens, type RegistryToken } from "@/lib/liquidity/classify";
import { raydiumLpShare } from "@/lib/liquidity/fees";
import { depositUrl, poolChartUrl } from "@/lib/liquidity/venues";
import type { LiquidityPool, ReviewPool } from "@/lib/liquidity/types";

const API = "https://api-v3.raydium.io/pools/info/mint";

/** The subset of Raydium's API v3 pool object we rely on (verified against the live API). */
type RaydiumPool = {
  id: string;
  type: "Concentrated" | "Standard";
  feeRate: number;
  tvl: number;
  mintA: { address: string; symbol: string };
  mintB: { address: string; symbol: string };
  day: { volume: number; feeApr: number; rewardApr: (number | { apr?: number })[] };
  week: { volume: number; feeApr: number };
  config?: { protocolFeeRate?: number; fundFeeRate?: number };
};

const rewardSum = (xs: RaydiumPool["day"]["rewardApr"]) =>
  xs.reduce<number>((s, r) => s + (typeof r === "number" ? r : (r?.apr ?? 0)), 0);

/** Every Raydium pool that holds a registered Solana stock token. */
export async function fetchRaydium(
  registry: RegistryToken[],
  index: Map<string, RegistryToken>,
  fetchedAt: string,
): Promise<{ pools: LiquidityPool[]; review: ReviewPool[] }> {
  const mints = registry.filter((t) => t.chain === "Solana");
  const seen = new Map<string, RaydiumPool>();

  for (const token of mints) {
    const url = `${API}?mint1=${token.address}&poolType=all&poolSortField=volume24h&sortType=desc&pageSize=50&page=1`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Raydium API responded ${res.status} for ${token.symbol}`);
    const body = (await res.json()) as { success: boolean; data?: { data: RaydiumPool[] } };
    if (!body.success || !body.data) throw new Error(`Raydium API returned no data for ${token.symbol}`);
    for (const p of body.data.data) seen.set(p.id, p);
    await new Promise((r) => setTimeout(r, 250));
  }

  const pools: LiquidityPool[] = [];
  for (const p of seen.values()) {
    const built = legsFromTokens("Solana", [p.mintA, p.mintB], index);
    if (!built) continue;
    const share = raydiumLpShare(p.config);
    const net = (v: number) => (share === null ? null : v * share);
    pools.push({
      id: `raydium:Solana:${p.id}`,
      address: p.id,
      venueId: "raydium",
      variant: p.type === "Concentrated" ? "CLMM" : "Standard",
      chain: "Solana",
      symbol: `${p.mintA.symbol} / ${p.mintB.symbol}`,
      legs: built.legs.map((l) => ({
        symbol: l.symbol,
        address: l.address,
        stock: l.stock ? { symbol: l.stock.symbol, underlying: l.stock.underlying, issuer: l.stock.issuer } : null,
      })),
      underlyings: [...new Set(built.stockLegs.map((s) => s.underlying))],
      issuers: [...new Set(built.stockLegs.map((s) => s.issuer))],
      pairType: built.pairType,
      poolType: classifyPoolType("raydium-amm", p.type === "Concentrated" ? "Concentrated" : "Standard"),
      feeTier: Number((p.feeRate * 100).toFixed(4)),
      apyBase: net(p.day.feeApr),
      apyBaseGross: p.day.feeApr,
      lpFeeShare: share,
      apyReward: rewardSum(p.day.rewardApr),
      apyBase7d: net(p.week.feeApr),
      tvlUsd: p.tvl,
      volumeUsd1d: p.day.volume,
      volumeUsd7d: p.week.volume,
      feeNote:
        share === null
          ? "Raydium's figure, before its protocol cut: this pool does not publish the cut."
          : `After Raydium's ${Math.round((1 - share) * 100)}% protocol cut. Raydium's own figure, ${p.day.feeApr.toFixed(2)}%, is computed on the full fee.`,
      url: depositUrl("raydium", "Solana", p.id, p.type),
      chartUrl: poolChartUrl("Solana", p.id),
      source: "raydium-api",
      fetchedAt,
    });
  }
  return { pools, review: [] };
}
