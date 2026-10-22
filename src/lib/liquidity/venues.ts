/**
 * The three liquidity venues we cover, and how to recognise and link to them.
 * Narrowed deliberately to Raydium, Uniswap and Aero: the venues where almost
 * all tokenized-stock liquidity actually sits.
 */
export type VenueId = "raydium" | "uniswap" | "aero";
export type Venue = { id: VenueId; name: string; website: string };

export const VENUES: Record<VenueId, Venue> = {
  raydium: { id: "raydium", name: "Raydium", website: "https://raydium.io/liquidity-pools/" },
  uniswap: { id: "uniswap", name: "Uniswap", website: "https://app.uniswap.org/explore/pools" },
  aero: { id: "aero", name: "Aero", website: "https://app.aero.xyz/liquidity/pools" },
};

/** Our chain name -> GeckoTerminal network id, Uniswap explore slug, EVM chain id. */
export const EVM_CHAINS: Record<string, { gecko: string; uniswap: string; chainId: number }> = {
  Base: { gecko: "base", uniswap: "base", chainId: 8453 },
  BSC: { gecko: "bsc", uniswap: "bnb", chainId: 56 },
  Ethereum: { gecko: "eth", uniswap: "ethereum", chainId: 1 },
  "Robinhood Chain": { gecko: "robinhood", uniswap: "robinhood", chainId: 4663 },
};

/**
 * Map a GeckoTerminal dex id to one of our venues. Aero is the October 2026
 * merger of Aerodrome and Velodrome; pools created before it still trade under
 * their old dex ids, so they count as Aero with a "pre-merger" variant.
 */
export function venueForDex(dexId: string): { venue: VenueId; variant: string | null } | null {
  const uni = dexId.match(/^uniswap-v(\d)/);
  if (uni) return { venue: "uniswap", variant: `v${uni[1]}` };
  if (/^aero-/.test(dexId)) return { venue: "aero", variant: null };
  if (/^aerodrome-slipstream/.test(dexId)) return { venue: "aero", variant: "Slipstream, pre-merger" };
  if (/^aerodrome/.test(dexId)) return { venue: "aero", variant: "Basic, pre-merger" };
  if (/^velodrome/.test(dexId)) return { venue: "aero", variant: "Velodrome, pre-merger" };
  return null;
}

/** The page where a user actually deposits into this pool. All three verified in a browser. */
export function depositUrl(
  venue: VenueId,
  chain: string,
  address: string,
  raydiumType?: "Concentrated" | "Standard",
): string {
  if (venue === "raydium") {
    return raydiumType === "Standard"
      ? `https://raydium.io/liquidity/increase/?mode=add&pool_id=${address}`
      : `https://raydium.io/clmm/create-position/?pool_id=${address}`;
  }
  const c = EVM_CHAINS[chain];
  if (!c) return VENUES[venue].website;
  if (venue === "uniswap") return `https://app.uniswap.org/explore/pools/${c.uniswap}/${address}`;
  return `https://app.aero.xyz/deposit/${c.chainId}-${address}`;
}

/** An independent page for the exact pool, used as the "where this came from" link. */
export function poolChartUrl(chain: string, address: string): string {
  const net = chain === "Solana" ? "solana" : EVM_CHAINS[chain]?.gecko;
  return net ? `https://www.geckoterminal.com/${net}/pools/${address}` : "";
}
