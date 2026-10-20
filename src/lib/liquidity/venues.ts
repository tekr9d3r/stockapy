/**
 * DefiLlama project slug -> the venue we show. Inclusion follows DefiLlama's own
 * protocol category rather than our judgement: Dexs and Liquidity Managers are
 * places you provide liquidity; aggregators and lending protocols are not.
 */
export type Venue = { id: string; name: string; website: string };

const uniswap: Venue = { id: "uniswap", name: "Uniswap", website: "https://app.uniswap.org" };
const aerodrome: Venue = { id: "aerodrome", name: "Aerodrome", website: "https://aerodrome.finance" };
const pancakeswap: Venue = { id: "pancakeswap", name: "PancakeSwap", website: "https://pancakeswap.finance" };

export const VENUES: Record<string, Venue> = {
  "raydium-amm": { id: "raydium", name: "Raydium", website: "https://raydium.io" },
  "orca-dex": { id: "orca", name: "Orca", website: "https://www.orca.so" },
  "aerodrome-slipstream": aerodrome,
  "aerodrome-v1": aerodrome,
  "uniswap-v2": uniswap,
  "uniswap-v3": uniswap,
  "uniswap-v4": uniswap,
  "pancakeswap-amm": pancakeswap,
  "pancakeswap-amm-v3": pancakeswap,
  "curve-dex": { id: "curve", name: "Curve", website: "https://curve.fi" },
  ekubo: { id: "ekubo", name: "Ekubo", website: "https://ekubo.org" },
  "alandale-v3": { id: "alandale", name: "Alandale", website: "https://alandale.xyz" },
  "fluxion-network": { id: "fluxion", name: "Fluxion", website: "https://app.fluxion.network" },
  "nest-cl": { id: "nest", name: "Nest", website: "https://app.usenest.xyz" },
  "project-x": { id: "project-x", name: "Project X", website: "https://www.prjx.com" },
  // A Liquidity Manager: it runs Uniswap v3 positions on the depositor's behalf.
  arrowfarm: { id: "arrowfarm", name: "Arrow Farm", website: "https://www.arrowfarm.io" },
};

/** Projects that match a stock but are deliberately not listed, with the reason. */
export const SKIPPED_PROJECTS: Record<string, string> = {
  beefy:
    "Yield Aggregator in DefiLlama's taxonomy. It wraps a pool on another venue, so " +
    "listing it would count that pool twice.",
  "ripe-protocol":
    "Lending protocol in DefiLlama's taxonomy. Its matching pool is governance staking, " +
    "not a pool traders swap through.",
};

/** Version suffix for display, e.g. "v3", "Slipstream". */
export function venueVariant(project: string): string | null {
  const m = project.match(/-(v\d)$/);
  if (m) return m[1];
  if (project === "aerodrome-slipstream") return "Slipstream";
  if (project === "pancakeswap-amm-v3") return "v3";
  return null;
}
