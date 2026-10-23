/**
 * Turning a verified token into "which asset is this": ticker, company name and
 * asset type, or a reason it is out of scope. Pure, so it is unit-tested.
 *
 * Scope (decided 2026-10-23): company shares from any market, plain ETFs and
 * commodity funds. Out: leveraged or inverse funds, preferred shares, and
 * wrapped versions of another issuer's token.
 */

export type IssuerId = "xstocks" | "ondo" | "coinbase" | "binance" | "robinhood";
export type AssetKind = "stock" | "etf";

export type Classified =
  | { ok: true; ticker: string; company: string; type: AssetKind }
  | { ok: false; reason: string };

/** How each issuer names its tokens. Used to strip the issuer's decoration. */
const NAME_SUFFIX: Record<IssuerId, RegExp> = {
  xstocks: /\s*xStock$/i,
  ondo: /\s*\(Ondo Tokenized(?: Stock)?\)$/i,
  coinbase: /$^/, // Coinbase names are the plain company name.
  binance: /\s*\(bStocks Tokenized Stock\)$/i,
  robinhood: /\s*•\s*Robinhood Token$/i,
};

/** And how each issuer decorates the ticker. */
const SYMBOL_SUFFIX: Record<IssuerId, RegExp> = {
  xstocks: /x$/,
  ondo: /on$/i,
  coinbase: /c$/,
  binance: /b$/i,
  robinhood: /$^/,
};

/** Whether a token's on-chain name is in the issuer's naming scheme at all. */
export function matchesIssuerName(issuer: IssuerId, name: string): boolean {
  // Coinbase and Binance put the plain company name on-chain ("Micron Technology
  // Inc.", "Alphabet"); GeckoTerminal's "(bStocks Tokenized Stock)" is its own label.
  if (issuer === "coinbase" || issuer === "binance") return name.trim().length > 0 && !/^Coinbase Wrapped/i.test(name);
  return NAME_SUFFIX[issuer].test(name.trim());
}

const LEVERAGED_TICKERS = new Set(["TQQQ", "SQQQ", "SOXL", "SOXS", "SNXX", "TSLL", "NVDL", "UPRO", "SPXU", "SDS", "QLD", "SSO", "UVXY", "TNA", "TZA", "LABU", "FAS"]);
const PREFERRED_TICKERS = new Set(["STRC", "STRK", "STRF", "STRD"]);
/** Funds whose names do not say "ETF". */
const ETF_TICKERS = new Set(["SPY", "QQQ", "GLD", "SLV", "USO", "FXI", "SGOV", "IAU", "DIA", "IWM", "VOO", "VTI", "TLT", "COPX", "EEM", "EWZ", "KWEB", "ARKK"]);

/** Classify a verified token. `symbol` and `name` are the token's own, on-chain. */
export function classifyStockToken(issuer: IssuerId, symbol: string, name: string): Classified {
  const n = name.trim();
  const s = symbol.trim();
  if (/^(few\s+)?wrapped\b/i.test(n) || /^(fw|w)[A-Z]/.test(s)) return { ok: false, reason: "wrapped token" };
  if (!matchesIssuerName(issuer, n)) return { ok: false, reason: `name not in ${issuer}'s naming scheme` };

  const ticker = s.replace(SYMBOL_SUFFIX[issuer], "").toUpperCase();
  if (!/^[A-Z][A-Z0-9]{0,5}(\.[A-Z])?$/.test(ticker)) return { ok: false, reason: `unusable ticker "${ticker}"` };
  const company = n.replace(NAME_SUFFIX[issuer], "").replace(/&amp;/g, "&").trim();

  if (LEVERAGED_TICKERS.has(ticker) || /\b([2-9]x|ultra\s?pro|leveraged|bull|bear|inverse|short)\b/i.test(company)) {
    return { ok: false, reason: "leveraged or inverse fund" };
  }
  if (PREFERRED_TICKERS.has(ticker) || /\b(preferred|PP)\b/.test(company)) return { ok: false, reason: "preferred share" };

  const type: AssetKind =
    ETF_TICKERS.has(ticker) || /\b(ETF|Trust|Fund|iShares|SPDR|Invesco|ProShares|Global X)\b/i.test(company) ? "etf" : "stock";
  return { ok: true, ticker, company, type };
}

/**
 * Pick one display name for an asset from the names its issuers use: the
 * shortest is usually the cleanest ("Micron Technology" over "Micron Technology Inc.").
 */
export function canonicalCompany(names: string[]): string {
  return [...new Set(names.map((n) => n.trim()).filter(Boolean))].sort((a, b) => a.length - b.length || a.localeCompare(b))[0] ?? "";
}
