# StockAPY

An independent comparison of every place a tokenized stock can earn yield — across chains,
issuers, DeFi protocols and CeFi platforms. Base interest, token incentives and points are
shown separately, with a source and a timestamp on every number.

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

## Commands

```bash
npm run dev         # local dev server
npm run build       # production build (fails on a broken seed)
npm run typecheck   # tsc --noEmit
npm run fetch       # run the fetchers, write data/snapshots/
npm run discover    # also list equity pools DefiLlama has that the seed does not
```

## Adding an opportunity

1. Add the token to `tokens:` in `data/seed.yaml` if it is new.
2. Add an entry under `opportunities:`.
   - If DefiLlama covers it, run `npm run discover` to find the pool UUID and set
     `data_source: defillama` with `external_id: <uuid>`.
   - If not, use `data_source: manual` and fill in the `manual:` block with a `checked_at` date.
3. Open the URL, confirm it is live, and set `verified: true`.
4. `npm run build` — the seed loader fails the build on a broken reference or a missing
   `external_id`.

Never type an APY you did not read from a source. Leave it `null`; the UI says "not collected"
rather than showing a zero.

## Layout

```
content/hub/*.mdx          blog posts (frontmatter + live <LiveTable /> embeds)
data/seed.yaml             what exists
data/snapshots/            what it paid, hourly
src/lib/data/              loaders, referential integrity, the seed↔snapshot join
src/lib/fetchers/          one isolated module per source
src/lib/seo/jsonld.ts      Dataset, ItemList, FAQPage, BlogPosting, DefinedTermSet
src/config.ts              brand name, URL, disclaimer
scripts/run-fetchers.ts    writes the snapshots
```

## Not in scope

LP pools that need a token pair, yield tokenization, strategies where you supply stablecoins
rather than the stock, and executing anything. This is an information site. It links out.
