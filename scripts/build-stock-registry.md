# Building and extending `data/stock-tokens.yaml`

The liquidity fetcher only lists a pool if one of its tokens is in this registry,
matched by contract address. Symbols are never enough on their own: they are free
to copy, and DefiLlama's pool list contains copies.

## How the current registry was built

1. Took every multi-asset pool from `https://yields.llama.fi/pools` and kept the
   legs whose symbol looks like a stock we track (`looksLikeStock` in
   `src/lib/liquidity/classify.ts`), paired with the address in `underlyingTokens`.
2. Checked each address against the token's **on-chain name**:
   - EVM chains: `eth_call` of `name()` (selector `0x06fdde03`) on a public RPC —
     Base `mainnet.base.org`, BSC `bsc-dataseed.binance.org`, Ethereum
     `ethereum-rpc.publicnode.com`, Mantle `rpc.mantle.xyz`, HyperEVM
     `rpc.hyperliquid.xyz/evm`, Robinhood Chain `rpc.mainnet.chain.robinhood.com`.
   - Solana: Jupiter's token API, and where it did not answer, the mint's own
     Token-2022 metadata via `getAccountInfo` (`jsonParsed`).
3. Extra provenance checks where names alone were weak:
   - Solana xStocks must share the mint authority (`7pt9tk…`) and update
     authority (`5aMNNL…`) of a known-good xStock such as NVDAx.
   - Binance bStocks must share runtime bytecode with each other (all currently
     hash to the same proxy). This is how QQQB, named "Invesqo QQQ" on-chain,
     was confirmed genuine despite the typo.
4. Rejected anything whose name did not describe the stock. So far:
   Solana `87T62igE…` (symbol AMDC), on-chain name "美元稳定币" — "USD stablecoin".

## Adding a token

`data/snapshots/liquidity.json` has a `review` list of pools that look like stock
pairs but did not match. For each address worth adding, run the checks above, then
append an entry with `chain`, quoted `address`, `symbol`, `underlying` (must be a
ticker in `data/seed.yaml`), `issuer` and the verified `name`. Run `npm test` and
`npm run fetch`.
