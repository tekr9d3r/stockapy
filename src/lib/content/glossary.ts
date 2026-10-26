/**
 * Definitions, kept as data so the page and the JSON-LD cannot drift apart.
 * `tradfi` is the nearest thing a stock investor already knows, for readers who
 * come from brokers rather than crypto.
 */
export type Term = { term: string; slug: string; definition: string; tradfi?: string };

export const GLOSSARY: Term[] = [
  {
    term: "Tokenized stock",
    slug: "tokenized-stock",
    definition:
      "A blockchain token that tracks the price of a listed share. You hold a claim on the " +
      "issuer, not the share itself, which means no voting rights and, in most cases, no " +
      "dividend paid in cash to your wallet.",
    tradfi: "Closest to a tracker certificate or a CFD on the share: exposure to the price, a claim on the issuer.",
  },
  {
    term: "APY",
    slug: "apy",
    definition:
      "Annual percentage yield: what a rate would pay over a year if it stayed the same, " +
      "including compounding. Rates in crypto change hourly, so an APY is a snapshot, not a promise.",
    tradfi: "Like the AER quoted on a savings account, except it can change at any moment.",
  },
  {
    term: "Stablecoin",
    slug: "stablecoin",
    definition:
      "A token designed to stay worth one US dollar, such as USDC or USDT, backed by cash and " +
      "short-term government debt held by its issuer. It is the cash leg of most pools and loans.",
    tradfi: "Like a dollar balance at a payments company, rather than at a bank.",
  },
  {
    term: "Wallet",
    slug: "wallet",
    definition:
      "The app that holds the keys to your tokens. With a self-custody wallet nobody else can " +
      "move your assets, and nobody can recover them if you lose the keys.",
    tradfi: "Like a brokerage account where you are also the custodian.",
  },
  {
    term: "Chain",
    slug: "chain",
    definition:
      "The blockchain a token lives on, such as Ethereum, Solana or Base. A token on one chain " +
      "cannot be used on another without a bridge, so the chain decides which platforms you can use.",
    tradfi: "Like the exchange or settlement system a security is held in.",
  },
  {
    term: "Loan-to-value (LTV)",
    slug: "ltv",
    definition:
      "How much you can borrow as a share of your collateral's value. At 60% LTV, $10,000 of " +
      "stock lets you borrow up to $6,000. Go over the limit and the position is liquidated.",
    tradfi: "The same idea as the loan-to-value on a margin or Lombard loan.",
  },
  {
    term: "Liquidation",
    slug: "liquidation",
    definition:
      "When a loan's collateral falls in value past the limit, the protocol sells part of it " +
      "automatically to repay the loan, usually with a penalty. There is no phone call first.",
    tradfi: "Like a margin call that is settled instantly by a forced sale.",
  },
  {
    term: "Liquidity pool",
    slug: "liquidity-pool",
    definition:
      "A pot of two tokens, such as a stock token and a stablecoin, that traders swap against. " +
      "Whoever supplies the pot earns a fee on every trade.",
    tradfi: "Like acting as the market maker for a single pair, without running an order book.",
  },
  {
    term: "Base APY",
    slug: "base-apy",
    definition:
      "The interest borrowers actually pay to supply-side depositors. It is the only part of a " +
      "quoted rate that survives when an incentive programme ends. On tokenized stock markets " +
      "it is currently near zero because almost nobody borrows against tokenized shares.",
    tradfi: "Like the lending fee in a securities-lending programme: paid by whoever borrows the shares.",
  },
  {
    term: "Reward APY",
    slug: "reward-apy",
    definition:
      "Yield paid in a protocol's own token out of an incentive budget, rather than by " +
      "borrowers. It is a marketing cost and it can be reduced or stopped without notice.",
    tradfi: "Like a broker's sign-up bonus: paid by the platform to attract deposits, for as long as it chooses.",
  },
  {
    term: "Points",
    slug: "points",
    definition:
      "A tally a protocol keeps of your deposits, usually hinting at a future airdrop with no " +
      "stated value, rate or date. Points are not an APY and cannot honestly be converted " +
      "into one.",
    tradfi: "Like loyalty points with no published exchange rate.",
  },
  {
    term: "Collateral-only venue",
    slug: "collateral-only",
    definition:
      "A lending market that accepts a tokenized stock as collateral but never lends it out. " +
      "Your deposit earns nothing; it only unlocks borrowing power. Aave V4's Equities Hub and " +
      "Morpho Blue markets both work this way.",
    tradfi: "Like shares pledged for a Lombard loan: they secure the loan but are not lent out.",
  },
  {
    term: "Looped vault",
    slug: "looped-vault",
    definition:
      "A vault that deposits your stock, borrows a stablecoin against it, buys more of the " +
      "stock and repeats. It multiplies whatever incentive is being paid, and it introduces a " +
      "liquidation price that holding the share directly never had.",
    tradfi: "Like buying on margin, then buying more with the new shares as collateral.",
  },
  {
    term: "TVL",
    slug: "tvl",
    definition:
      "Total value locked: the dollar value sitting in a market. A thin market can show a high " +
      "rate that disappears the moment any real size arrives.",
    tradfi: "Like assets under management, for a single market.",
  },
  {
    term: "Oracle gap risk",
    slug: "oracle-gap-risk",
    definition:
      "Tokenized stocks trade around the clock but the underlying exchange does not. A price " +
      "oracle has to quote something over the weekend, and the gap when the real market reopens " +
      "can trigger liquidations before anyone can react.",
    tradfi: "Like a stock gapping down at the open through your stop-loss.",
  },
  {
    term: "Impermanent loss",
    slug: "impermanent-loss",
    definition:
      "What a liquidity provider gives up when prices move, compared with simply holding. The " +
      "pool keeps its two sides equal in value, so as a stock rises it sells the stock and you " +
      "end with fewer shares. With NVDA up 30% in a 50/50 pool you hold about 12% fewer shares " +
      "and roughly 0.85% less value than if you had held. Trading fees have to cover it.",
    tradfi: "Like a rebalancing fund that keeps selling winners to buy cash.",
  },
  {
    term: "Concentrated liquidity",
    slug: "concentrated-liquidity",
    definition:
      "A pool design (Uniswap v3/v4, Orca, Raydium CLMM, Aerodrome Slipstream) where you choose a " +
      "price range. Inside it your capital earns far more fees; outside it you earn nothing and " +
      "hold only the side that lost. Quoted APYs assume you stay in range.",
    tradfi: "Like posting limit orders only within a price band.",
  },
  {
    term: "Fee tier",
    slug: "fee-tier",
    definition:
      "The share of each swap a pool pays its liquidity providers, such as 0.05%, 0.3% or 1%. " +
      "Higher tiers earn more per trade but attract fewer trades.",
    tradfi: "Like the spread a market maker captures, set in advance.",
  },
  {
    term: "Volume / TVL",
    slug: "volume-tvl",
    definition:
      "A day's trading volume divided by the value in the pool: how hard each dollar of " +
      "liquidity is working. A high ratio on a small pool often means a rate that will not " +
      "survive more liquidity arriving.",
    tradfi: "Like turnover relative to fund size.",
  },
  {
    term: "In-kind yield",
    slug: "in-kind-yield",
    definition:
      "Yield paid in the same asset you deposited — more tokenized shares rather than a " +
      "stablecoin. Kraken's xStocks Vaults pay this way.",
    tradfi: "Like a scrip dividend: paid in more shares rather than cash.",
  },
];
