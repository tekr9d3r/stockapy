# StockAPY

An independent comparison of what you can do with a tokenized stock:

- **earn** on it;
- **provide liquidity** with it in a DEX pool;
- **borrow** against it, posting it as collateral.

It covers chains, issuers, DeFi protocols and CeFi platforms. Base interest, token incentives and points are shown separately, and every number carries a source and a timestamp.

Live at [stockapy.xyz](https://stockapy.xyz).

## How it works

There is no database. A handful of files drive the whole site:

- `data/seed.yaml`: the source of truth for **what exists** for Earn and Borrow. It lists underlying stocks, issuers, tokens, platforms and opportunities, plus hand-entered rates where no API covers them.
- `data/stock-tokens.yaml` and `data/underlyings.yaml`: the registry of verified stock-token contracts (291 tokens across 127 stocks and ETFs). Liquidity pools are matched against it by contract address.
- `data/snapshots/`: the **live numbers**. A GitHub Action writes them and commits them to the repo, so every published figure has a git commit behind it. The dated files in the same folder are the history.
  - `latest.json`: Earn and Borrow rates.
  - `liquidity.json`: the liquidity pools.
  - `pool-index.json`: GeckoTerminal's pool index, refreshed a slice at a time.

Pages read these files at build time and revalidate hourly (ISR), so every number ships inside the server HTML. The browser fetches nothing for the tables, which means crawlers and AI fetchers see the complete dataset.

## Pages

| Path | What it is |
|---|---|
| `/` | Home: the top 5 opportunities in each of the three categories, and a newsletter signup |
| `/earn` | Deposit the stock and get paid. Driven by `data/seed.yaml` |
| `/liquidity` | Pair the stock in a DEX pool and earn trading fees. Auto-discovered (see below) |
| `/borrow` | Post the stock as collateral. Seed rows with a `borrow:` block |
| `/stocks`, `/stock/[ticker]` | One page per stock, created only when the stock has an active market |
| `/hub` | Knowledge Hub: explainers and articles (`content/hub/*.mdx`) |
| `/glossary`, `/methodology`, `/issuers`, `/platforms` | Reference pages |
| `/newsletter` | Weekly email signup (Brevo, double opt-in) |
| `/developers` | API and data access for agents |

Light and dark themes are both supported.

## Data sources

**Earn and Borrow** (`src/lib/fetchers/`), one isolated module per source:

- `defillama.ts`: supply and borrow rates for most venues.
- `aave.ts`: Aave V4 GraphQL, for the equity spokes DefiLlama misses.
- `morpho.ts`: Morpho markets.
- `krakenInk.ts`: Kraken on Ink.

**Liquidity** (`src/lib/fetchers/liquidity/`). A pool is listed only if one of its tokens is in the registry, matched by contract address:

- `aero.ts`: Aero pools on Base and Robinhood Chain, read on-chain from the LP Sugar contract.
  - Fee APY comes from annualised fees divided by TVL.
  - Gauge emissions are shown in $/day.
  - Aero LPs take either the fees or the emissions, never both, so no combined total is shown.
- `geckoterminal.ts`: every other EVM DEX.
  - The free API allows about 5 requests a minute, so requests are spaced 12 s apart.
  - The pool index is refreshed a slice at a time across runs.
- `raydium.ts`: Solana.

A pool is listed only if it trades at least $1,000 a day and holds at least $10,000 of TVL. Pools that empty or vanish stay listed as Ended. Token symbols come from third parties, so they are cleaned before they are stored.

The liquidity step runs independently of the Earn/Borrow fetchers, so either can fail without taking the other down.

**Refresh.** The workflow is in `.github/workflows/fetch.yml`.
- It is scheduled hourly, but GitHub usually runs it every 4–6 hours.
- A run takes about 6 minutes.
- It rebases onto `main` before pushing, retrying up to three times.

## Agent and machine access

Every number on the site is also available without parsing HTML. All of it is licensed CC BY 4.0.

- **JSON API v1.**
  - Endpoints: `/api/v1/summary`, `/api/v1/earn`, `/api/v1/liquidity`, `/api/v1/borrow`, `/api/v1/stocks` and `/api/v1/stocks/{ticker}`.
  - Behaviour: they are filterable and sortable, open to cross-origin requests (CORS), and cached for an hour. A bad parameter returns 400.
  - Spec: `/openapi.json`.
- **Markdown mirrors.** Append `.md` to any page (`/earn.md`, `/stock/nvda.md`), or send `Accept: text/markdown`.
- **`/llms.txt` and `/llms-full.txt`.** The second holds every current table in one file.
- **JSON-LD** on every page: Dataset, ItemList, FAQPage, BreadcrumbList and BlogPosting.
- **Legacy endpoints.** `/api/opportunities` and `/api/opportunities.csv` stay for backward compatibility.

All of these share their field mapping through `src/lib/api/serialize.ts`, so field names never drift between formats.

## Commands

```bash
npm run dev         # local dev server
npm run build       # production build (fails on a broken seed)
npm run typecheck   # tsc --noEmit
npm run fetch       # run the fetchers, write data/snapshots/
npm run discover    # also list equity pools DefiLlama has that the seed does not
npm run logos       # fetch any missing stock, issuer, chain and venue logos into public/logos
npm test            # unit tests (tsx --test)

npx tsx scripts/discover-stock-tokens.ts           # find new stock tokens, report only
npx tsx scripts/discover-stock-tokens.ts --write   # also add verified tokens to the registry
```

## Configuration

Copy `.env.example`. The site runs without these variables; only the newsletter signup needs them, and without them it says signups are not on yet.

| Variable | Purpose |
|---|---|
| `BREVO_API_KEY` | Brevo key with *Contacts* and *Transactional email* access |
| `BREVO_LIST_ID` | The list that confirmed subscribers join |
| `BREVO_DOI_TEMPLATE_ID` | The double opt-in confirmation template |

Vercel Analytics is enabled through `@vercel/analytics` and needs no keys.

## Adding an opportunity

1. Add the token to `tokens:` in `data/seed.yaml` if it is new.
2. Add an entry under `opportunities:`. Set its data source:
   - **DefiLlama:** run `npm run discover` to find the pool UUID, then set `data_source: defillama` with `external_id: <uuid>`.
   - **Aave V4 reserve:** use `data_source: aave_api` with `external_id: <reserve symbol>`.
   - **No source covers it:** use `data_source: manual` and fill in the `manual:` block with a `checked_at` date.
3. If the stock can be posted as collateral there, add a `borrow:` block with the `loan_asset`. Where the borrow rate comes from depends on the market type:
   - **Isolated market** (Jupiter, Morpho): the opportunity's own pool carries the borrow rate.
   - **Pooled market** (Kamino): the stock reserve's borrow APR is the cost of borrowing *the stock*, not the stablecoin. Set `rate_pool` to the stablecoin reserve in that market instead.
4. Open the market on the platform and paste the address bar into `deep_link`. It should be the page with the deposit or borrow form, not the app's front door.
   - Leave it out rather than guessing. Several protocols run duplicate markets for the same stock and loan asset at the same LTV, and a link to the wrong one misrepresents the row's risk.
5. Confirm the market is live and set `verified: true`.
6. Run `npm run build`. The seed loader fails the build on a broken reference or a missing `external_id`.

## Adding stock tokens

Liquidity pools are found automatically, but only for tokens in the registry. See `scripts/build-stock-registry.md` for how new tokens are discovered and how each issuer's provenance is checked:

- xStocks: mint and update authority.
- Robinhood and Ondo: EIP-1967 beacons.
- Coinbase on Base: its native token format.
- bStocks: matched by name.

Scope rules for the registry:
- **Included:** US and global stocks, plus plain ETFs and commodities.
- **Excluded:** leveraged, preferred and wrapped tokens.

## Retiring a programme

When a platform stops paying, do not delete the rows. Set `status: ended` with `ended_on` and an `ended_note` saying what was observed. The row then:

- keeps its last known rate;
- renders struck through and marked Ended;
- drops out of every headline figure, the borrow tables and the platform rollups.

`active: false` is different: it removes a row from the site altogether, which loses the history.

Never type an APY you did not read from a source. Leave it `null`; the UI says "not collected" rather than showing a zero.

## Security

- **Headers** (`next.config.ts`):
  - a Content-Security-Policy limited to this origin, plus Vercel Analytics;
  - `X-Frame-Options: DENY`, `nosniff`, a Referrer-Policy and a Permissions-Policy;
  - no `X-Powered-By`.
- **Signup endpoint** (`/api/subscribe`):
  - the request body is capped in size;
  - requests are rate-limited per IP and per email address;
  - the response never reveals whether an address is already subscribed.
  - A Vercel Firewall rate-limit rule on this path is the robust layer on top.
- **Content and markup:**
  - Hub slugs are validated, and JavaScript front matter is disabled.
  - JSON-LD is escaped before it is inlined into the page.
- **CI:** GitHub Actions are pinned to commit SHAs.

## Layout

```
content/hub/*.mdx            Knowledge Hub articles (front matter + live <LiveTable /> embeds)
data/seed.yaml               what exists (earn and borrow)
data/stock-tokens.yaml       verified stock-token contracts (liquidity matching)
data/underlyings.yaml        stocks and ETFs found by the discovery script
data/snapshots/              what it paid, refreshed by the GitHub Action
src/app/                     pages, /api/v1, /md mirrors, llms.txt, sitemap, robots
src/lib/data/                loaders, referential integrity, the seed↔snapshot join
src/lib/fetchers/            one isolated module per earn/borrow source
src/lib/fetchers/liquidity/  aero.ts, geckoterminal.ts, raydium.ts
src/lib/liquidity/           registry matching, pool classification, symbol cleaning
src/lib/api/                 serializers, query parsing, Markdown, OpenAPI
src/lib/seo/jsonld.ts        Dataset, ItemList, FAQPage, BlogPosting, DefinedTermSet
src/middleware.ts            Accept: text/markdown → Markdown mirror
src/config.ts                brand name, URL, social links, newsletter, disclaimer
scripts/run-fetchers.ts      writes the snapshots
scripts/discover-stock-tokens.ts  finds and verifies new stock tokens
```

## Not in scope

Yield tokenization, strategies where you supply stablecoins rather than the stock, and executing anything. This is an information site. It links out.
