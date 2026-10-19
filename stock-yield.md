# Project: StockYield (working name)

A comparison site that shows tokenized stock holders where they can earn yield on their tokens, across chains, issuers, DeFi protocols and CeFi platforms, in one place.

> Working name. Alternatives under consideration: Equifarm, xEarn, Dividendless, OnchainDividends. Keep the brand name in one config constant so it can be changed easily.

---

## 1. The problem

Tokenized stocks (xStocks, Ondo, Coinbase, Robinhood, Binance bStocks, etc.) now live on many chains (Solana, Ethereum, Base, Robinhood Chain, BNB Chain, Ink). Earn opportunities for them are scattered across lending protocols, vaults and exchange earn products. The same underlying stock (e.g. NVDA) exists as several different tokens (NVDAx, NVDAon, NVDAc, Robinhood NVDA, NVDAB), each with different yield options. Nobody compares these side by side.

## 2. Product scope

### In scope (MVP)
- **Single-asset opportunities only**: the user deposits ONE tokenized stock token and earns yield on it. Plus a separate category for "collateral / borrow" venues (Aave, Morpho) that the owner explicitly wants listed.
- DeFi protocols and CeFi platforms.
- Comparison by underlying stock, token, issuer, chain, platform.

### Explicitly out of scope (for now)
- LP pools that require depositing a pair (Raydium, Orca, Uniswap, PancakeSwap, Curve).
- Yield tokenization (Pendle).
- Strategies where the user supplies USDC/stablecoins rather than the stock.
- Executing transactions / wallet connect / deposits. This is an info site (infofi), not a dapp. Link out to the platform.
- Financial advice. The site shows data only.

---

## 3. Opportunity universe (seed data)

URLs are app-level pages. Deep links per pool are not stable, so store `url` per opportunity and verify each one manually (`verified: boolean` field).

### 3.1 DeFi: deposit the stock, earn yield

| Platform | Chain | Issuer | Tokens (seed) | URL | Notes |
|---|---|---|---|---|---|
| Kamino Lend (xStocks Market) | Solana | xStocks | SPYx, QQQx, TSLAx, NVDAx, GOOGLx, MSTRx | https://kamino.com | Main venue. Yield mostly USDC incentives + xStocks Points |
| Jupiter Lend | Solana | xStocks | SPYx, QQQx, TSLAx, NVDAx (+ more, filter on Borrow page) | https://jup.ag/lend | Supply APY shown per xStock vault, plus xPoints |
| Loopscale | Solana | xStocks | xStocks | https://app.loopscale.com | Fixed-rate order-book lending. Rates often thin |
| Euler | Ethereum | xStocks, Ondo | xStocks, SPYon, QQQon, TSLAon | https://app.euler.finance | Check whether supply side actually earns |
| Superform (SuperStocks / superNVDA) | Base | Coinbase | NVDAc | https://app.superform.xyz | Single deposit UX, but internally borrows USDC on Aave V4. Flag liquidation risk |

### 3.2 DeFi: collateral / borrow venues (listed on request)

| Platform | Chain | Issuer | Tokens | URL | Notes |
|---|---|---|---|---|---|
| Aave V4 Equities Hub | Base | Coinbase | AAPLc, AMZNc, GOOGLc, METAc, MSFTc, NVDAc, TSLAc | https://app.aave.com | Stock = collateral only. Yield goes to USDC suppliers. Stock APY = 0% |
| Morpho | Ethereum, Robinhood Chain | Ondo, xStocks, Robinhood | SPYon, QQQon, xStocks, Robinhood Stock Tokens | https://app.morpho.org | Morpho Blue collateral earns nothing. Stock APY = 0% |

Label these clearly as "Collateral / Borrow" so users are not surprised by 0% APY on their stock.

### 3.3 CeFi

| Platform | Tokens | Type | Data access |
|---|---|---|---|
| Kraken xStocks Vaults | SPYx, QQQx, NVDAx | Vault, yield paid in-kind, ~3 day withdrawal | On-chain (Veda BoringVault on Ink) + Kraken private Earn API |
| Bitrue Flexible Staking | Ondo tokens (MSFTON, METAON) + Apple, Nvidia, Tesla | Flexible, no lock | No known API. Manual / scrape |
| Crypto.com Stocks Earn | Crypto.com tokenized stocks | Flexible, "up to 4%" | No known API. Manual / scrape |
| Bybit Dual Asset | 6 xStocks (SpaceX, NVIDIA, Apple, Alphabet, Coinbase, Amazon) | Structured, fixed term | Public API (see 4.3). Put in a separate "Structured" category |

### 3.4 Watchlist (not live yet as stock-earn, track for later)
- Venus (BNB Chain, bStocks): collateral only at launch, borrowing paused.
- Lista DAO (BNB Chain, bStocks).
- Aster (BNB Chain, bStocks as trading collateral).

### 3.5 Token naming conventions (for normalization)
| Issuer | Suffix pattern | Example |
|---|---|---|
| xStocks (Backed / Kraken) | `x` | NVDAx, SPYx |
| Ondo Global Markets | `on` | SPYon, TSLAon |
| Coinbase | `c` | NVDAc, AAPLc |
| Binance bStocks | `B` | NVDAB |
| Robinhood Stock Tokens | check on-chain symbol | |

Map every token to an `underlying_ticker` (NVDA, SPY, ...) so users can search "NVDA" and see all wrappers.

---

## 4. Data sources

### 4.1 DefiLlama Yields API (primary for DeFi, free, no key)
- `GET https://yields.llama.fi/pools` returns all pools with fields like `pool` (id), `project`, `chain`, `symbol`, `tvlUsd`, `apy`, `apyBase`, `apyReward`, `rewardTokens`, `underlyingTokens`.
- `GET https://yields.llama.fi/chart/{pool}` returns historical APY/TVL for one pool.
- Filter pools whose `symbol` or `underlyingTokens` match the tokenized stock token list (section 3.5).
- **Verify field names against the live response before coding against them.**
- DefiLlama token pages (e.g. https://defillama.com/token/googlx) list all markets per stock token. Useful for discovering new pools manually.

### 4.2 Direct on-chain reads (fallback / for pools DefiLlama misses)
- Kraken xStocks Vaults: Veda BoringVault contracts on Ink. Read total assets (TVL) and share price over time (derive APY). Find contract addresses from Kraken/Veda docs or explorer.
- Kamino / Jupiter Lend: if DefiLlama lacks per-reserve data for xStocks, use their public APIs/SDKs (research needed).

### 4.3 CeFi APIs
- **Bybit (public, no auth)**:
  - `GET https://api.bybit.com/v5/earn/product?category=FlexibleSaving&coin=...` returns `estimateApr` (updated every 10 min). Reward APRs come separately in `bonusEvents`.
  - `GET /v5/earn/advance/product` for advanced/structured products (Dual Asset likely here; check if xStocks appear).
  - `GET /v5/earn/apr-history` for history.
- **Kraken (private)**: `POST https://api.kraken.com/0/private/Earn/Strategies` requires an API key (no special permission). Results are filtered by the caller's region. Use the owner's EU account key. No TVL.
- **Crypto.com, Bitrue**: no known public earn API. Start with manual entry via an admin form or a JSON/YAML seed file. Scraping is optional later.

### 4.4 Optional / later
- RWA.xyz API: Enterprise only (paid). Good for token universe metadata, NOT for DeFi yields. Skip for MVP.
- Bitcompare API, Yieldo: CeFi rate aggregators; probably don't cover tokenized stocks. Check later.

### 4.5 Data honesty rules
- Always store and display `apy_base`, `apy_reward` and `points` separately. Most stock-side yield is incentives/points, not organic interest. This split is a core differentiator.
- CeFi TVL is usually not disclosed. Show "Not disclosed" rather than hiding the column.
- Every number shows `source` and `last_updated`.
- Manually entered rates are marked as "manual" with the date checked.

---

## 5. Data model

```
underlying_assets
  id, ticker (NVDA), name (NVIDIA), type (stock | etf)

issuers
  id, name (xStocks, Ondo, Coinbase, Robinhood, Binance bStocks), website, structure_note

tokens
  id, symbol (NVDAx), underlying_asset_id, issuer_id, chain, contract_address, decimals

platforms
  id, name, kind (defi | cefi), website, logo

opportunities
  id, token_id, platform_id, chain,
  category (earn | collateral | structured),
  url, verified (bool),
  lockup (none | days | fixed_term), withdrawal_delay_days,
  eligibility_note (e.g. "Excluded: US, UK, CA, AU, UAE"),
  risk_notes (text), data_source (defillama | onchain | bybit_api | kraken_api | manual),
  external_id (e.g. DefiLlama pool id), active (bool)

opportunity_snapshots   (time series)
  id, opportunity_id, timestamp,
  apy_total, apy_base, apy_reward, points_label (text, nullable),
  tvl_usd (nullable)
```

---

## 6. Features and pages

### 6.1 Home / main table
- One row per opportunity.
- Columns: Stock (underlying), Token, Issuer, Chain, Platform, Type (DeFi/CeFi), Category, APY total, Base, Rewards, Points, TVL, Lockup, Last updated, Link out.
- Filters: underlying ticker, issuer, chain, platform type (DeFi/CeFi), category (Earn / Collateral / Structured), min TVL, "hide 0% APY".
- Sort by APY, TVL.
- Search box: "NVDA" shows all NVDA wrappers.

### 6.2 Stock page (`/stock/[ticker]`)
- All tokens for that underlying, all opportunities grouped by token.
- Headline: "Best place to earn on NVDA right now".

### 6.3 Opportunity page (`/opportunity/[id]`)
- APY and TVL history chart.
- Explanation of where yield comes from (lending demand, incentives, points, vault strategy).
- Risks: liquidation (if strategy borrows), oracle / off-hours pricing, issuer structure, withdrawal delays.
- Eligibility / geo restrictions.
- Link out to the platform.

### 6.4 Platforms page and Issuers page
- Short description of each platform/issuer, supported chains, tokens.

### 6.5 About / Methodology
- How data is sourced and how often.
- "Not financial advice" disclaimer.
- Explain base vs reward vs points.

### 6.6 Later (not MVP)
- Country eligibility filter ("show me what I can use from Slovenia/EU").
- Liquidity / exit-risk score per opportunity.
- Email / Telegram alerts when APY changes.
- Public API.
- Wallet lookup: paste address, see which held stock tokens could earn more.

---

## 7. Tech stack (suggested, adjust if needed)

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **DB**: Postgres (Supabase or Neon). SQLite acceptable for local dev.
- **ORM**: Drizzle or Prisma
- **Data jobs**: scheduled jobs (Vercel Cron or GitHub Actions) that run fetchers and write snapshots
  - DefiLlama fetcher: every 1 hour
  - Bybit fetcher: every 1 hour
  - On-chain Kraken vault reader: every 6 hours
  - Manual entries: admin page or seed YAML file
- **Hosting**: Vercel
- **Env vars**: `DATABASE_URL`, `KRAKEN_API_KEY`, `KRAKEN_API_SECRET`, RPC URLs (Solana, Ink, Base, Ethereum)

### Architecture
```
/src
  /app            Next.js pages
  /components     table, filters, charts
  /lib/db         schema + queries
  /lib/fetchers   defillama.ts, bybit.ts, kraken.ts, onchain/*.ts, manual.ts
  /lib/normalize  token -> underlying mapping, APY normalization
/data
  seed.yaml       issuers, tokens, platforms, opportunities, manual CeFi rates
/scripts
  run-fetchers.ts
```

Each fetcher returns a common shape:
```ts
type Snapshot = {
  opportunityExternalId: string;
  apyTotal: number | null;
  apyBase: number | null;
  apyReward: number | null;
  pointsLabel?: string;
  tvlUsd: number | null;
  source: string;
  fetchedAt: string;
};
```

---

## 8. Build order (milestones)

1. **Seed + schema**: create DB schema and `seed.yaml` from section 3. Render the main table from seed data only (manual APYs).
2. **DefiLlama fetcher**: match pools to seeded tokens, store snapshots, show live APY/TVL. Log unmatched tokenized-stock pools for review.
3. **Bybit + Kraken fetchers**.
4. **Kraken xStocks vault on-chain reader** (Ink).
5. **Stock pages + opportunity pages with history charts**.
6. **Methodology page, disclaimers, SEO** (meta tags per stock page: "NVDA tokenized stock yield").
7. Polish, mobile layout, deploy.

---

## 9. Rules for Claude Code

- Never invent APYs, TVL, contract addresses or API fields. If unknown, leave null and add a TODO.
- Verify every external API response shape before writing parsers.
- Keep fetchers isolated so one failing source does not break the others.
- All rates displayed must have a source and timestamp.
- UI copy: plain, short, no hype. Not financial advice.
- Brand name lives in one config constant.
