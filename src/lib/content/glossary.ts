/** Definitions, kept as data so the page and the JSON-LD cannot drift apart. */
export type Term = { term: string; slug: string; definition: string };

export const GLOSSARY: Term[] = [
  {
    term: "Tokenized stock",
    slug: "tokenized-stock",
    definition:
      "A blockchain token that tracks the price of a listed share. You hold a claim on the " +
      "issuer, not the share itself, which means no voting rights and, in most cases, no " +
      "dividend paid in cash to your wallet.",
  },
  {
    term: "Base APY",
    slug: "base-apy",
    definition:
      "The interest borrowers actually pay to supply-side depositors. It is the only part of a " +
      "quoted rate that survives when an incentive programme ends. On tokenized stock markets " +
      "it is currently near zero because almost nobody borrows against tokenized shares.",
  },
  {
    term: "Reward APY",
    slug: "reward-apy",
    definition:
      "Yield paid in a protocol's own token out of an incentive budget, rather than by " +
      "borrowers. It is a marketing cost and it can be reduced or stopped without notice.",
  },
  {
    term: "Points",
    slug: "points",
    definition:
      "A tally a protocol keeps of your deposits, usually hinting at a future airdrop with no " +
      "stated value, rate or date. Points are not an APY and cannot honestly be converted " +
      "into one.",
  },
  {
    term: "Collateral-only venue",
    slug: "collateral-only",
    definition:
      "A lending market that accepts a tokenized stock as collateral but never lends it out. " +
      "Your deposit earns nothing; it only unlocks borrowing power. Aave V4's Equities Hub and " +
      "Morpho Blue markets both work this way.",
  },
  {
    term: "Looped vault",
    slug: "looped-vault",
    definition:
      "A vault that deposits your stock, borrows a stablecoin against it, buys more of the " +
      "stock and repeats. It multiplies whatever incentive is being paid, and it introduces a " +
      "liquidation price that holding the share directly never had.",
  },
  {
    term: "TVL",
    slug: "tvl",
    definition:
      "Total value locked: the dollar value sitting in a market. A thin market can show a high " +
      "rate that disappears the moment any real size arrives.",
  },
  {
    term: "Oracle gap risk",
    slug: "oracle-gap-risk",
    definition:
      "Tokenized stocks trade around the clock but the underlying exchange does not. A price " +
      "oracle has to quote something over the weekend, and the gap when the real market reopens " +
      "can trigger liquidations before anyone can react.",
  },
  {
    term: "Impermanent loss",
    slug: "impermanent-loss",
    definition:
      "What a liquidity provider gives up when prices move, compared with simply holding. The " +
      "pool keeps its two sides equal in value, so as a stock rises it sells the stock and you " +
      "end with fewer shares. With NVDA up 30% in a 50/50 pool you hold about 12% fewer shares " +
      "and roughly 0.85% less value than if you had held. Trading fees have to cover it.",
  },
  {
    term: "Concentrated liquidity",
    slug: "concentrated-liquidity",
    definition:
      "A pool design (Uniswap v3/v4, Orca, Raydium CLMM, Aerodrome Slipstream) where you choose a " +
      "price range. Inside it your capital earns far more fees; outside it you earn nothing and " +
      "hold only the side that lost. Quoted APYs assume you stay in range.",
  },
  {
    term: "Fee tier",
    slug: "fee-tier",
    definition:
      "The share of each swap a pool pays its liquidity providers, such as 0.05%, 0.3% or 1%. " +
      "Higher tiers earn more per trade but attract fewer trades.",
  },
  {
    term: "Volume / TVL",
    slug: "volume-tvl",
    definition:
      "A day's trading volume divided by the value in the pool: how hard each dollar of " +
      "liquidity is working. A high ratio on a small pool often means a rate that will not " +
      "survive more liquidity arriving.",
  },
  {
    term: "In-kind yield",
    slug: "in-kind-yield",
    definition:
      "Yield paid in the same asset you deposited — more tokenized shares rather than a " +
      "stablecoin. Kraken's xStocks Vaults pay this way.",
  },
];
