# StockAPY

An independent comparison of what you can do with a tokenized stock — **earn** on it, or post
it as **collateral and borrow** against it — across chains, issuers, DeFi protocols and CeFi
platforms. Base interest, token incentives and points are shown separately, with a source and
a timestamp on every number.

Live at [stockapy.xyz](https://stockapy.xyz).

## How it works

There is no database. Two files drive the whole site:

- `data/seed.yaml` — the source of truth for **what exists**: underlying stocks, issuers,
  tokens, platforms, opportunities, and hand-entered rates where no API covers them.
- `data/snapshots/latest.json` — the **live numbers**, written hourly by a GitHub Action and
  committed to the repo. Every published figure therefore has a git commit behind it, and the
  archived snapshots in the same folder are the history.

Pages read both at build time and revalidate hourly, so every number ships inside the server
HTML. Nothing in the comparison table is fetched by the browser — crawlers and AI fetchers see
the complete dataset.

## Three categories

- **Earn** (`/`) — deposit the stock and get paid. Driven by `data/seed.yaml`.
- **Liquidity** (`/liquidity`) — pair the stock in a DEX pool and earn trading fees.
  Auto-discovered from DefiLlama each run, matched by contract address against
  `data/stock-tokens.yaml` (see `scripts/build-stock-registry.md`), written to
  `data/snapshots/liquidity.json`. Pools that empty or vanish stay listed as Ended.
- **Borrow** (`/borrow`) — post the stock as collateral. Seed rows with a `borrow:` block.

The liquidity step runs independently of the earn/borrow fetchers: either can fail
without taking the other down.

## Commands

```bash
npm run dev         # local dev server
npm run build       # production build (fails on a broken seed)
npm run typecheck   # tsc --noEmit
npm run fetch       # run the fetchers, write data/snapshots/
npm run discover    # also list equity pools DefiLlama has that the seed does not
npm run logos       # fetch any missing stock and venue logos into public/logos
npm test            # pool matching and classification tests
```

## Adding an opportunity

1. Add the token to `tokens:` in `data/seed.yaml` if it is new.
2. Add an entry under `opportunities:`.
   - If DefiLlama covers it, run `npm run discover` to find the pool UUID and set
     `data_source: defillama` with `external_id: <uuid>`.
   - For an Aave V4 reserve, use `data_source: aave_api` with `external_id: <reserve symbol>`.
   - If nothing covers it, use `data_source: manual` and fill in the `manual:` block with a
     `checked_at` date.
3. If the stock can be posted as collateral there, add a `borrow:` block with the
   `loan_asset`. In an isolated market (Jupiter, Morpho) the opportunity's own pool carries
   the borrow rate. In a pooled market (Kamino) it does not — the stock reserve's borrow APR
   is the cost of borrowing *the stock*, so set `rate_pool` to the stablecoin reserve in that
   market instead.
4. Open the market on the platform and paste the address bar into `deep_link` — the page
   with the deposit or borrow form, not the app's front door. Leave it out rather than
   guessing: several protocols run duplicate markets for the same stock and loan asset at
   the same LTV, and a link to the wrong one misrepresents the row's risk.
5. Confirm the market is live and set `verified: true`.
6. `npm run build` — the seed loader fails the build on a broken reference or a missing
   `external_id`.

## Retiring a programme

When a platform stops paying, do not delete the rows. Set `status: ended` with `ended_on`
and an `ended_note` saying what was observed. The row keeps its last known rate, renders
struck through and marked Ended, and drops out of every headline figure, the borrow tables
and the platform rollups. `active: false` is different — that removes a row from the site
altogether, which loses the history.

Never type an APY you did not read from a source. Leave it `null`; the UI says "not collected"
rather than showing a zero.

## Layout

```
content/hub/*.mdx          blog posts (frontmatter + live <LiveTable /> embeds)
data/seed.yaml             what exists
data/snapshots/            what it paid, hourly
src/lib/data/              loaders, referential integrity, the seed↔snapshot join
src/lib/fetchers/          one isolated module per source
                           defillama.ts  supply + borrow for most venues
                           aave.ts       Aave V4 GraphQL (equity spokes DefiLlama misses)
src/lib/seo/jsonld.ts      Dataset, ItemList, FAQPage, BlogPosting, DefinedTermSet
src/config.ts              brand name, URL, disclaimer
scripts/run-fetchers.ts    writes the snapshots
```

## Not in scope

LP pools that need a token pair, yield tokenization, strategies where you supply stablecoins
rather than the stock, and executing anything. This is an information site. It links out.
