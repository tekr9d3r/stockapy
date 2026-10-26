# StockAPY

An independent comparison of yield on tokenized stocks: **earn** on them, **provide liquidity** with them, or **borrow** against them. It covers chains, issuers and platforms, and every number shows its source and a timestamp.

Live at [stockapy.xyz](https://stockapy.xyz).

## How it works

There is no database:

- `data/seed.yaml` lists the stocks, tokens, platforms and opportunities.
- `data/stock-tokens.yaml` is the registry of verified stock-token contracts.
- A GitHub Action fetches live rates and commits them to `data/snapshots/`.
- Pages are built from these files and revalidate hourly.

For agents and developers there is a JSON API (`/api/v1/*`, documented at `/openapi.json`). Any page is also available as Markdown by adding `.md` to its address, and there's an `/llms.txt`.

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build
npm run fetch    # fetch live data into data/snapshots/
npm test         # unit tests
```

## Configuration

The newsletter signup uses Brevo and needs three variables: `BREVO_API_KEY`, `BREVO_LIST_ID` and `BREVO_DOI_TEMPLATE_ID`. `.env.example` explains each one. The rest of the site runs without them.
