# Building and extending `data/stock-tokens.yaml`

The liquidity fetchers only list a pool if one of its tokens is in this registry,
matched by contract address. Symbols are never enough on their own: they are free
to copy, and pool lists contain copies.

## The usual way: `scripts/discover-stock-tokens.ts`

```
npx tsx scripts/discover-stock-tokens.ts           # report only -> data/stock-token-review.json
npx tsx scripts/discover-stock-tokens.ts --write   # also add verified tokens to the registry
npx tsx scripts/fetch-logos.ts                      # logos for any new assets
```

Run it when issuers list new stocks. It is not part of the hourly job.

**Candidates** come from the venues themselves: Raydium's busiest 3,000 pools,
every Aero pool on Base and Robinhood Chain (Sugar contract), GeckoTerminal name
searches ("Ondo Tokenized", "bStocks", "Robinhood Token") and Robinhood Chain's
busiest pools, and DefiLlama's pool list.

**Verification**, every candidate, accepted or rejected, is in the review file with
its reason:

| Issuer | Chain | Provenance |
|---|---|---|
| xStocks | Solana | Same mint authority and metadata update authority as a known-good xStock (NVDAx). |
| Robinhood | Robinhood Chain | EIP-1967 beacon of a Robinhood token already in the registry. |
| Ondo | Ethereum | Beacon of an Ondo token already in the registry. |
| Ondo | BNB Chain | A beacon shared by 10+ tokens whose on-chain names are in Ondo's "(Ondo Tokenized)" scheme. Weaker: the registry had no Ondo token on this chain to anchor it. |
| bStocks | BNB Chain | Beacon of a bStock already in the registry. |
| Coinbase | Base | Base native tokens (code `0xef`) can be created by anyone, so Coinbase's are recognised by their conventions together: a `0xb2000…` address, a `TICKERc` symbol, 8 decimals and a company name. Memecoins on the same prefix use 18 decimals. |

Then `src/lib/liquidity/stocks.ts` classifies the token: the on-chain name must be
in the issuer's naming scheme, and the asset must be in scope.

**Scope** (decided 2026-10-23): company shares from any market, plain ETFs and
commodity funds. Out: leveraged or inverse funds, preferred shares, and wrapped
versions of another issuer's token. Wrapped tokens already in the registry were
removed on the same date.

`--write` keeps every existing entry (minus wrapped ones), appends the new ones,
and adds any new asset to `data/underlyings.yaml` with a canonical name and type.
Those names are generated: edit them freely, re-running keeps existing entries.

## Adding a token by hand

Run the same checks on its address, then append an entry with `chain`, quoted
`address`, `symbol`, `underlying`, `issuer` and the verified on-chain `name`. If
the underlying is new, add it to `data/underlyings.yaml`. Run `npm test` and
`npm run fetch`.

## Rejected so far (notable)

- Solana `87T62igE…` (symbol AMDC): on-chain name "美元稳定币" ("USD stablecoin").
- Base `Basecat`, `BLUE CHIP`: on Coinbase's address prefix, but 18 decimals and not companies.
- Base `cbZEC`, `cbHYPE`: Coinbase's own wrapped crypto, not stocks.
