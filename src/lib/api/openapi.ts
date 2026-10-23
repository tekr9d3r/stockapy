import { ENDPOINTS, MAX_LIMIT } from "./query";
import { BRAND_NAME, SITE_DESCRIPTION, SITE_URL } from "@/config";

const str = (description: string, example?: string) => ({ schema: { type: "string" }, description, ...(example ? { example } : {}) });

const PARAMS: Record<string, object> = {
  ticker: { name: "ticker", in: "query", ...str("Underlying stock ticker, case-insensitive.", "NVDA") },
  chain: { name: "chain", in: "query", ...str("Chain name, e.g. Solana, Base, Ethereum, Robinhood Chain, BNB Chain.", "Solana") },
  platform: { name: "platform", in: "query", ...str("Platform name, e.g. Kamino Lend, Aave, Morpho.") },
  venue: { name: "venue", in: "query", ...str("DEX: Raydium, Uniswap or Aero.") },
  loan_asset: { name: "loan_asset", in: "query", ...str("What you borrow, e.g. USDC.") },
  status: { name: "status", in: "query", schema: { type: "string", enum: ["live", "ended", "all"], default: "live" } },
  pair: { name: "pair", in: "query", description: "stable = stock/stablecoin pools only.", schema: { type: "string", enum: ["stable", "all"], default: "stable" } },
  min_tvl: { name: "min_tvl", in: "query", description: "Minimum TVL in US dollars.", schema: { type: "number", minimum: 0 } },
  limit: { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: MAX_LIMIT, default: 100 } },
};

function listOp(summary: string, ep: { params: string[]; sorts: string[]; defaultSort: string }) {
  return {
    get: {
      summary,
      parameters: ep.params.map((p) =>
        p === "sort" ? { name: "sort", in: "query", schema: { type: "string", enum: ep.sorts, default: ep.defaultSort } } : PARAMS[p],
      ),
      responses: {
        "200": { description: "Matching records, with fetchedAt, licence and source." },
        "400": { description: "Unknown or invalid parameter; the message names the allowed values." },
      },
    },
  };
}

/** Hand-written OpenAPI 3.1 description of the v1 API. */
export function openapi() {
  return {
    openapi: "3.1.0",
    info: {
      title: `${BRAND_NAME} API`,
      version: "1.0.0",
      description: `${SITE_DESCRIPTION} Free, no key, CORS-open, refreshed hourly. Licence: CC BY 4.0 — cite ${BRAND_NAME} with a link.`,
    },
    servers: [{ url: SITE_URL }],
    paths: {
      "/api/v1/summary": { get: { summary: "Headline numbers across Earn, Liquidity and Borrow, plus the best figure per stock.", responses: { "200": { description: "Summary." } } } },
      "/api/v1/earn": listOp("Places that pay you to deposit a tokenized stock.", ENDPOINTS.earn),
      "/api/v1/liquidity": listOp("Active DEX pools that pair a tokenized stock. Rates before impermanent loss.", ENDPOINTS.liquidity),
      "/api/v1/borrow": listOp("Markets that accept a tokenized stock as collateral.", ENDPOINTS.borrow),
      "/api/v1/stocks": { get: { summary: "Every tracked stock with its best deposit APY, LP fee APY and max LTV.", responses: { "200": { description: "Stocks." } } } },
      "/api/v1/stocks/{ticker}": {
        get: {
          summary: "Everything for one stock: deposit venues, liquidity pools and borrow markets.",
          parameters: [{ name: "ticker", in: "path", required: true, schema: { type: "string" }, example: "nvda" }],
          responses: { "200": { description: "One stock." }, "404": { description: "Unknown ticker." } },
        },
      },
    },
  };
}
