/**
 * Pure classification for liquidity pools: no I/O, so it can be unit-tested.
 *
 * Matching is address-first against a registry of tokens whose on-chain NAME was
 * verified. Symbols alone are unsafe here: DefiLlama's pool list contains copies
 * of stock symbols (an "AMDC" on Solana is a USD stablecoin), and naive suffix
 * rules misfire on ordinary tokens (USDC ends in "C"; VB reads as Visa + "B").
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

export type PoolMatch = {
  legs: Leg[];
  stockLegs: RegistryToken[];
  pairType: PairType;
  matchedBy: "address" | "symbol";
};

export type MatchResult =
  | { match: PoolMatch; review?: undefined }
  | { match: null; review: string | null };

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

/** EVM addresses compare case-insensitively; Solana mints are case-sensitive. */
export function normAddress(address: string): string {
  return address.startsWith("0x") ? address.toLowerCase() : address;
}

const key = (chain: string, address: string) => `${chain}:${normAddress(address)}`;

export function buildIndex(tokens: RegistryToken[]): Map<string, RegistryToken> {
  return new Map(tokens.map((t) => [key(t.chain, t.address), t]));
}

export function splitSymbol(symbol: string): string[] {
  return (symbol ?? "").split(/[-/ ]+/).filter(Boolean);
}

/**
 * Does this leg LOOK like a tokenized stock we track, regardless of address?
 * Used only to decide what to flag for review, never to accept a pool.
 */
export function looksLikeStock(leg: string, chain: string, tickers: Set<string>): boolean {
  const s = leg.toUpperCase();
  const core = s.length > 4 && s.startsWith("W") ? s.slice(1) : s;
  for (const suffix of ["ON", "X", "C", "B"]) {
    if (core.endsWith(suffix) && tickers.has(core.slice(0, -suffix.length))) return true;
  }
  return chain === "Robinhood Chain" && tickers.has(s);
}

export function classifyPair(legs: Leg[]): PairType {
  const others = legs.filter((l) => !l.stock);
  if (others.length === 0) return "stock-stock";
  const s = others[0].symbol.toUpperCase();
  if (STABLES.has(s)) return "stock-stable";
  if (MAJORS.has(s)) return "stock-crypto";
  return "stock-other";
}

export function matchPool(
  pool: { chain: string; symbol: string; underlyingTokens: string[] | null },
  index: Map<string, RegistryToken>,
  tickers: Set<string>,
): MatchResult {
  const symbols = splitSymbol(pool.symbol);
  const addresses = pool.underlyingTokens ?? [];

  // 1. Address match: the only kind we trust when the pool gives us addresses.
  //    Addresses decide which legs are stocks; symbols are only for display.
  if (addresses.length > 0) {
    const stocks = addresses.map((a) => index.get(key(pool.chain, a)) ?? null);
    let legSymbols = symbols;
    if (addresses.length !== symbols.length) {
      // A token's own symbol contained a separator ("TSLAX-ELON-SAN" is TSLAx
      // paired with ELON-SAN), so symbols cannot be aligned with addresses. Name
      // the stock legs from the registry and give the rest what is left over.
      const stockSymbols = new Set(stocks.flatMap((t) => (t ? [t.symbol.toUpperCase()] : [])));
      const rest = symbols.filter((sym) => !stockSymbols.has(sym.toUpperCase())).join("-");
      legSymbols = stocks.map((t) => (t ? t.symbol : rest || "?"));
    }
    const legs: Leg[] = addresses.map((address, i) => ({
      symbol: legSymbols[i],
      address,
      stock: stocks[i],
    }));
    const stockLegs = legs.flatMap((l) => (l.stock ? [l.stock] : []));
    if (stockLegs.length > 0) {
      return { match: { legs, stockLegs, pairType: classifyPair(legs), matchedBy: "address" } };
    }
    // A stock-looking symbol on an unregistered address is either a token we have
    // not verified yet or an imposter. Either way a human should look.
    const suspicious = symbols.find((s) => looksLikeStock(s, pool.chain, tickers));
    return {
      match: null,
      review: suspicious
        ? `symbol ${suspicious} looks like a stock but its address is not in the registry`
        : null,
    };
  }

  // 2. Symbol fallback, only when the pool carries no usable addresses. Accept a
  //    leg only if its symbol is exactly one registered token's symbol on this chain.
  const byChainSymbol = new Map<string, RegistryToken[]>();
  for (const t of index.values()) {
    if (t.chain !== pool.chain) continue;
    const k = t.symbol.toUpperCase();
    byChainSymbol.set(k, [...(byChainSymbol.get(k) ?? []), t]);
  }
  const legs: Leg[] = symbols.map((symbol) => {
    const hits = byChainSymbol.get(symbol.toUpperCase()) ?? [];
    return { symbol, address: null, stock: hits.length === 1 ? hits[0] : null };
  });
  const stockLegs = legs.flatMap((l) => (l.stock ? [l.stock] : []));
  if (stockLegs.length > 0) {
    return { match: { legs, stockLegs, pairType: classifyPair(legs), matchedBy: "symbol" } };
  }
  const suspicious = symbols.find((s) => looksLikeStock(s, pool.chain, tickers));
  return {
    match: null,
    review: suspicious ? `symbol ${suspicious} looks like a stock but the pool has no token addresses` : null,
  };
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
