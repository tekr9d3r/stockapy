/**
 * Pure classification for liquidity pools: no I/O, so it can be unit-tested.
 *
 * Matching is by address only, against a registry of tokens whose on-chain NAME
 * was verified. Symbols are never trusted: pool lists contain copies of stock
 * symbols (an "AMDC" on Solana is a USD stablecoin), and naive suffix rules
 * misfire on ordinary tokens (USDC ends in "C"; VB reads as Visa + "B").
 */

export type RegistryToken = {
  chain: string;
  address: string;
  symbol: string;
  underlying: string;
  issuer: string;
  name: string;
};

export type PairType = "stock-stable" | "stock-crypto" | "stock-stock" | "stock-other";
export type PoolType = "concentrated" | "full-range" | "unknown";

export type Leg = { symbol: string; address: string | null; stock: RegistryToken | null };

/** Dollar-pegged tokens. Pairs against these are the default view. */
export const STABLES = new Set([
  "USDC", "USDT", "USDG", "AUSD", "JUPUSD", "PYUSD", "USD1", "USDE", "DAI", "FDUSD",
  "USDS", "USDT0", "USD₮0", "USDC.E", "USDBC", "USDH", "USDB", "RLUSD",
]);

/** Large, liquid crypto assets (and tokenised gold): not speculative counterparts. */
export const MAJORS = new Set([
  "SOL", "WSOL", "ETH", "WETH", "BNB", "WBNB", "BTC", "WBTC", "CBBTC", "KBTC",
  "HYPE", "WHYPE", "MNT", "WMNT", "JITOSOL", "MSOL", "JUPSOL", "STETH", "WSTETH",
  "XAUT", "XAUT0", "PAXG",
]);

/**
 * A token symbol from a third party, made safe to show and to hand to agents.
 * Anyone can name a token anything (markup, "ignore previous instructions…"),
 * and these symbols reach our pages, Markdown and llms-full.txt. Real tickers
 * use letters, digits and a few separators, so anything else is dropped and the
 * result is capped; an empty result becomes "?".
 */
export function cleanSymbol(symbol: unknown): string {
  const s = String(symbol ?? "")
    .normalize("NFKC")
    // Tether writes its name with the tugrik sign (USD₮0); keep it readable, not "USD0".
    .replace(/₮/g, "T")
    .replace(/[^A-Za-z0-9.$_+\-/ ()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24)
    .trim();
  return s || "?";
}

/** EVM addresses compare case-insensitively; Solana mints are case-sensitive. */
export function normAddress(address: string): string {
  return address.startsWith("0x") ? address.toLowerCase() : address;
}

const key = (chain: string, address: string) => `${chain}:${normAddress(address)}`;

export function buildIndex(tokens: RegistryToken[]): Map<string, RegistryToken> {
  return new Map(tokens.map((t) => [key(t.chain, t.address), t]));
}

export function classifyPair(legs: Leg[]): PairType {
  const others = legs.filter((l) => !l.stock);
  if (others.length === 0) return "stock-stock";
  const s = others[0].symbol.toUpperCase();
  if (STABLES.has(s)) return "stock-stable";
  if (MAJORS.has(s)) return "stock-crypto";
  return "stock-other";
}

/**
 * Fee tier as a percentage, parsed from DefiLlama's free-text poolMeta.
 * Values above 5% are dynamic or hook fees reported in a different sense
 * (Uniswap v4 shows "80.00%"), so they are treated as unknown, not as a tier.
 */
export function parseFeeTier(poolMeta: string | null): number | null {
  if (!poolMeta) return null;
  const m = poolMeta.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v <= 5 ? v : null;
}

const CONCENTRATED_PROJECTS = new Set([
  "uniswap-v3", "uniswap-v4", "orca-dex", "aerodrome-slipstream", "pancakeswap-amm-v3",
  "ekubo", "alandale-v3", "nest-cl", "arrowfarm",
]);
const FULL_RANGE_PROJECTS = new Set(["uniswap-v2", "aerodrome-v1", "pancakeswap-amm"]);

export function classifyPoolType(project: string, poolMeta: string | null): PoolType {
  const meta = (poolMeta ?? "").toLowerCase();
  if (meta.startsWith("concentrated") || /\bcl\d*\b/.test(meta) || meta.includes("cl range")) {
    return "concentrated";
  }
  if (meta.startsWith("standard")) return "full-range";
  if (CONCENTRATED_PROJECTS.has(project)) return "concentrated";
  if (FULL_RANGE_PROJECTS.has(project)) return "full-range";
  return "unknown";
}

/**
 * Build legs from tokens a source has already identified by address (Raydium
 * mints, GeckoTerminal base/quote tokens). Returns null when no leg is a
 * registered stock.
 */
export function legsFromTokens(
  chain: string,
  tokens: { address: string; symbol: string }[],
  index: Map<string, RegistryToken>,
): { legs: Leg[]; stockLegs: RegistryToken[]; pairType: PairType } | null {
  const legs: Leg[] = tokens.map((t) => ({
    symbol: t.symbol,
    address: t.address,
    stock: index.get(key(chain, t.address)) ?? null,
  }));
  const stockLegs = legs.flatMap((l) => (l.stock ? [l.stock] : []));
  if (stockLegs.length === 0) return null;
  return { legs, stockLegs, pairType: classifyPair(legs) };
}
