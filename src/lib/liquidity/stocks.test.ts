import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalCompany, classifyStockToken, matchesIssuerName } from "./stocks";

const ok = (issuer: Parameters<typeof classifyStockToken>[0], symbol: string, name: string) => {
  const r = classifyStockToken(issuer, symbol, name);
  assert.ok(r.ok, `${symbol} should be accepted: ${!r.ok ? r.reason : ""}`);
  return r;
};
const no = (issuer: Parameters<typeof classifyStockToken>[0], symbol: string, name: string, reason: RegExp) => {
  const r = classifyStockToken(issuer, symbol, name);
  assert.equal(r.ok, false, `${symbol} should be rejected`);
  if (!r.ok) assert.match(r.reason, reason);
};

describe("classifyStockToken: tickers and companies per issuer", () => {
  it("xStocks", () => {
    const r = ok("xstocks", "BRK.Bx", "Berkshire Hathaway xStock");
    assert.equal(r.ticker, "BRK.B");
    assert.equal(r.company, "Berkshire Hathaway");
    assert.equal(ok("xstocks", "GLDx", "Gold xStock").type, "etf");
  });
  it("Ondo, including lower-case symbols", () => {
    const r = ok("ondo", "spcxon", "SpaceX (Ondo Tokenized Stock)");
    assert.equal(r.ticker, "SPCX");
    assert.equal(r.company, "SpaceX");
    assert.equal(ok("ondo", "SLVon", "iShares Silver Trust (Ondo Tokenized)").type, "etf");
  });
  it("Coinbase: plain names, 'c' suffix", () => {
    const r = ok("coinbase", "MUc", "Micron Technology Inc.");
    assert.equal(r.ticker, "MU");
    assert.equal(r.type, "stock");
  });
  it("Binance bStocks", () => {
    assert.equal(ok("binance", "spyb", "SPY (bStocks Tokenized Stock)").ticker, "SPY");
    assert.equal(ok("binance", "babab", "Alibaba (bStocks Tokenized Stock)").ticker, "BABA");
    // On-chain, bStocks carry the plain name.
    const mu = ok("binance", "MUB", "Micron Technology Inc");
    assert.equal(mu.ticker, "MU");
    assert.equal(mu.company, "Micron Technology Inc");
  });
  it("Robinhood: plain tickers, decoded entities", () => {
    const r = ok("robinhood", "HIMS", "Hims &amp; Hers Health • Robinhood Token");
    assert.equal(r.company, "Hims & Hers Health");
    assert.equal(ok("robinhood", "gld", "SPDR Gold Shares • Robinhood Token").ticker, "GLD");
  });
});

describe("classifyStockToken: out of scope", () => {
  it("rejects leveraged and inverse funds", () => {
    no("xstocks", "TQQQx", "TQQQ xStock", /leveraged/);
    no("binance", "soxlb", "Semicon Bull 3X ETF (bStocks Tokenized Stock)", /leveraged/);
    no("ondo", "SQQQon", "ProShares UltraPro Short QQQ (Ondo Tokenized)", /leveraged/);
  });
  it("rejects preferred shares", () => {
    no("xstocks", "STRCx", "Strategy PP Variable xStock", /preferred/);
  });
  it("rejects wrapped tokens", () => {
    no("ondo", "fwTSLAon", "Few Wrapped Tesla (Ondo Tokenized)", /wrapped/);
    no("xstocks", "wTCENTx", "Wrapped Tencent xStock", /wrapped/);
  });
  it("rejects names outside the issuer's scheme", () => {
    no("ondo", "USDY", "Ondo US Dollar Yield", /naming scheme/);
    assert.equal(matchesIssuerName("coinbase", "Coinbase Wrapped ZEC"), false);
    assert.equal(matchesIssuerName("robinhood", "Hood Sword Inu"), false);
  });
});

describe("canonicalCompany", () => {
  it("prefers the shortest clean name", () => {
    assert.equal(canonicalCompany(["Micron Technology Inc.", "Micron Technology"]), "Micron Technology");
  });
});
