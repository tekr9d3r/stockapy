/**
 * Finds tokenized-stock tokens by scanning the venues themselves, verifies each
 * one on-chain, and (with --write) adds the verified ones to the registry.
 *
 *   npx tsx scripts/discover-stock-tokens.ts           report only
 *   npx tsx scripts/discover-stock-tokens.ts --write   also update the registry
 *
 * Not part of the hourly job: run it when issuers list new stocks. Every
 * candidate, accepted or rejected, is written to data/stock-token-review.json
 * with the reason, so the registry can always be audited.
 *
 * Verification (a candidate must pass all that apply):
 *   - its on-chain name is in the issuer's naming scheme (stocks.ts);
 *   - provenance (see verifyEvm): the issuer's beacon proxy on EVM chains, or
 *     Coinbase's conventions for Base native tokens; Solana xStocks must share
 *     mint and metadata-update authority with a known-good xStock;
 *   - it is in scope: not leveraged, preferred or wrapped (stocks.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { createPublicClient, http, parseAbi, type Address } from "viem";
import { parse } from "yaml";
import { canonicalCompany, classifyStockToken, matchesIssuerName, type IssuerId } from "../src/lib/liquidity/stocks";
import { loadSeed } from "../src/lib/data/seed";

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, "data", "stock-tokens.yaml");
const UNDERLYINGS = path.join(ROOT, "data", "underlyings.yaml");
const REVIEW = path.join(ROOT, "data", "stock-token-review.json");
const WRITE = process.argv.includes("--write");

type RegistryEntry = { chain: string; address: string; symbol: string; underlying: string; issuer: IssuerId; name: string };
type Candidate = { chain: string; address: string; sources: Set<string> };

const EVM: Record<string, { rpc: string; gecko: string; llama: string }> = {
  Base: { rpc: "https://mainnet.base.org", gecko: "base", llama: "Base" },
  BSC: { rpc: "https://bsc-dataseed.binance.org", gecko: "bsc", llama: "BSC" },
  Ethereum: { rpc: "https://ethereum-rpc.publicnode.com", gecko: "eth", llama: "Ethereum" },
  "Robinhood Chain": { rpc: "https://rpc.mainnet.chain.robinhood.com", gecko: "robinhood", llama: "Robinhood Chain" },
};
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
/** A known-good xStock: every genuine xStock shares its mint and update authority. */
const XSTOCK_REFERENCE = "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (a: string) => (a.startsWith("0x") ? a.toLowerCase() : a);

async function getJson(url: string, init?: RequestInit, attempt = 0): Promise<any> {
  const res = await fetch(url, { ...init, headers: { accept: "application/json", ...(init?.headers ?? {}) } }).catch(() => null);
  if (res?.ok) return res.json();
  if (attempt < 4) {
    await sleep(res?.status === 429 ? 30_000 : 3_000);
    return getJson(url, init, attempt + 1);
  }
  throw new Error(`${url} -> ${res?.status ?? "no response"}`);
}

// ---------------------------------------------------------------- candidates

const candidates = new Map<string, Candidate>();
function add(chain: string, address: string, source: string) {
  if (!address) return;
  const key = `${chain}:${norm(address)}`;
  const c = candidates.get(key) ?? { chain, address: norm(address), sources: new Set<string>() };
  c.sources.add(source);
  candidates.set(key, c);
}

/** Raydium's busiest 3,000 pools: every mint named like an xStock. */
async function fromRaydium() {
  for (let page = 1; page <= 3; page++) {
    const d = await getJson(
      `https://api-v3.raydium.io/pools/info/list?poolType=all&poolSortField=volume24h&sortType=desc&pageSize=1000&page=${page}`,
    );
    for (const p of d.data.data) for (const m of [p.mintA, p.mintB]) if (/xStock/i.test(m.name ?? "")) add("Solana", m.address, "raydium");
  }
}

/** Every Aero pool on Base and Robinhood Chain, via the Sugar contract. */
async function fromAero() {
  const abi = parseAbi([
    "struct Lp { address lp; string symbol; uint8 decimals; uint256 liquidity; int24 poolType; int24 tick; uint160 sqrtRatio; address token0; uint256 reserve0; uint256 staked0; address token1; uint256 reserve1; uint256 staked1; address gauge; uint256 gaugeLiquidity; bool gaugeAlive; address rewardsManager; address factory; uint256 emissions; address emissionsToken; uint128 emissionsCap; uint256 poolFee; uint256 unstakedFee; uint256 token0Fees; uint256 token1Fees; uint48 createdAt; address nfpm; uint48 windowStart; uint48 windowEnd; int24 windowOpenTick; int24 windowCloseTick; uint256 windowSwapCount; uint256 windowVolume0; uint256 windowVolume1; uint256 windowFee0; uint256 windowFee1; uint256 windowMevVolume0; uint256 windowMevVolume1; uint256 windowMevFee0; uint256 windowMevFee1; }",
    "function all(uint256 _limit, uint256 _offset, uint48 _window, uint8 _filter) external view returns (Lp[] memory _lps)",
    "function count() external view returns (uint256)",
  ]);
  const SUGAR: Record<string, Address> = {
    Base: "0xb2A7bDB79FbE254DdAeB151c9ff7649bddad48E5",
    "Robinhood Chain": "0x471C34138D06001AEe399af9EBEbbdF680b966B3",
  };
  for (const [chain, address] of Object.entries(SUGAR)) {
    const c = createPublicClient({ transport: http(EVM[chain].rpc, { retryCount: 3 }) });
    const n = await c.readContract({ address, abi, functionName: "count" });
    for (let o = BigInt(0); o < n; o += BigInt(300)) {
      const page = await c.readContract({ address, abi, functionName: "all", args: [BigInt(300), o, 0, 0] });
      for (const p of page) for (const t of [p.token0, p.token1]) {
        // On Base only Coinbase's stock tokens (vanity 0xb2000…) are candidates;
        // on Robinhood Chain every token is checked by name.
        if (chain !== "Base" || t.toLowerCase().startsWith("0xb2000000000000000000")) add(chain, t, "aero");
      }
    }
  }
}

/** GeckoTerminal: name searches per issuer, and Robinhood Chain's busiest pools. */
async function fromGecko() {
  const searches: [string, string][] = [
    ["Ondo Tokenized", "eth"],
    ["Ondo Tokenized", "bsc"],
    ["bStocks", "bsc"],
    ["Robinhood Token", "robinhood"],
  ];
  const chainOf: Record<string, string> = { eth: "Ethereum", bsc: "BSC", robinhood: "Robinhood Chain", base: "Base" };
  const take = (d: any, net: string, src: string) => {
    for (const t of d.included ?? []) if (t.type === "token") add(chainOf[net], t.attributes.address, src);
    return (d.data ?? []).length;
  };
  for (const [q, net] of searches) {
    for (let page = 1; page <= 10; page++) {
      const d = await getJson(
        `https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(q)}&network=${net}&include=base_token,quote_token&page=${page}`,
      );
      const n = take(d, net, "gecko-search");
      await sleep(2_500);
      if (n < 20) break;
    }
  }
  for (let page = 1; page <= 10; page++) {
    const d = await getJson(
      `https://api.geckoterminal.com/api/v2/networks/robinhood/pools?include=base_token,quote_token&sort=h24_volume_usd_desc&page=${page}`,
    );
    const n = take(d, "robinhood", "gecko-top");
    await sleep(2_500);
    if (n < 20) break;
  }
}

/** DefiLlama's yield pools: token addresses of every listed pool on our EVM chains. */
async function fromDefiLlama() {
  const d = await getJson("https://yields.llama.fi/pools");
  const byLlama = Object.fromEntries(Object.entries(EVM).map(([k, v]) => [v.llama, k]));
  for (const p of d.data) {
    const chain = byLlama[p.chain];
    if (!chain) continue;
    const symbols = String(p.symbol).split("-");
    (p.underlyingTokens ?? []).forEach((addr: string, i: number) => {
      const a = String(addr).toLowerCase();
      if (!a.startsWith("0x")) return;
      const sym = symbols[i] ?? "";
      const looksIssued =
        (chain === "Base" && a.startsWith("0xb2000000000000000000")) ||
        chain === "Robinhood Chain" ||
        /ON$/i.test(sym) ||
        (chain === "BSC" && /B$/i.test(sym));
      if (looksIssued) add(chain, a, "defillama");
    });
  }
}

// ---------------------------------------------------------------- verification

type Verdict = {
  chain: string;
  address: string;
  sources: string[];
  name?: string;
  symbol?: string;
  issuer?: IssuerId;
  ticker?: string;
  company?: string;
  type?: string;
  accepted: boolean;
  reason: string;
};

const ERC20 = parseAbi(["function name() view returns (string)", "function symbol() view returns (string)"]);

const BEACON_SLOT = "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";
const DECIMALS = parseAbi(["function decimals() view returns (uint8)"]);
/** An issuer's beacon must be shared by at least this many tokens in its naming scheme. */
const CLUSTER_MIN = 10;

type Probe = Verdict & { code?: string; beacon?: string; decimals?: number };

/**
 * Provenance per chain, strongest first:
 *  - beacon proxies (Robinhood, Ondo, bStocks): the token's EIP-1967 beacon is the
 *    issuer's, taken from a token already in the registry; where the registry has
 *    none on that chain, a beacon shared by CLUSTER_MIN+ tokens named in one
 *    issuer's scheme (Ondo on BNB Chain). Weaker, and recorded as such.
 *  - Base native tokens (code 0xef, Coinbase): anyone can create one, so the
 *    issuer is recognised by its conventions instead: the 0xb2000… address, a
 *    TICKERc symbol, 8 decimals, and a company name (not "Coinbase Wrapped …").
 */
async function verifyEvm(chain: string, list: Candidate[], refBeacons: Map<string, IssuerId>): Promise<Verdict[]> {
  const c = createPublicClient({ transport: http(EVM[chain].rpc, { retryCount: 6, retryDelay: 2000, batch: { batchSize: 20 } }) });
  const probes: Probe[] = [];
  for (let i = 0; i < list.length; i += 10) {
    const chunk = list.slice(i, i + 10);
    probes.push(
      ...(await Promise.all(
        chunk.map(async (cand): Promise<Probe> => {
          const base: Probe = { chain, address: cand.address, sources: [...cand.sources], accepted: false, reason: "" };
          try {
            const a = cand.address as Address;
            const [code, name, symbol, slot, decimals] = await Promise.all([
              c.getCode({ address: a }),
              c.readContract({ address: a, abi: ERC20, functionName: "name" }),
              c.readContract({ address: a, abi: ERC20, functionName: "symbol" }),
              c.getStorageAt({ address: a, slot: BEACON_SLOT }),
              c.readContract({ address: a, abi: DECIMALS, functionName: "decimals" }).catch(() => undefined),
            ]);
            const beacon = slot && BigInt(slot) !== BigInt(0) ? `0x${slot.slice(-40)}` : undefined;
            return { ...base, name, symbol, code, beacon, decimals };
          } catch (err) {
            return { ...base, reason: `could not read token: ${String(err).slice(0, 80)}` };
          }
        }),
      )),
    );
    await sleep(200);
  }

  // Beacons shared by many tokens in Ondo's naming scheme, for chains where the
  // registry has no Ondo token to take the beacon from.
  const clusterBeacons = new Map<string, IssuerId>();
  const counts = new Map<string, number>();
  for (const p of probes) if (p.beacon && p.name && matchesIssuerName("ondo", p.name)) counts.set(p.beacon, (counts.get(p.beacon) ?? 0) + 1);
  for (const [b, n] of counts) if (n >= CLUSTER_MIN && !refBeacons.has(`${chain}:${b}`)) clusterBeacons.set(b, "ondo");

  return probes.map((p): Verdict => {
    const { code, beacon, decimals, ...v } = p;
    if (v.reason) return v;
    let issuer: IssuerId | undefined;
    let provenance = "";
    if (beacon && refBeacons.has(`${chain}:${beacon}`)) {
      issuer = refBeacons.get(`${chain}:${beacon}`);
      provenance = "beacon of a registered token";
    } else if (beacon && clusterBeacons.has(beacon)) {
      issuer = clusterBeacons.get(beacon);
      provenance = `beacon shared by ${counts.get(beacon)} tokens named in ${issuer}'s scheme`;
    } else if (chain === "Base" && code === "0xef" && v.address.startsWith("0xb2000000000000000000") && decimals === 8 && /^[A-Z][A-Z0-9.]{0,6}c$/.test(v.symbol ?? "")) {
      issuer = "coinbase";
      provenance = "Base native token with Coinbase's conventions (0xb2… address, TICKERc, 8 decimals)";
    }
    if (!issuer) return { ...v, reason: "no issuer provenance (beacon or Coinbase conventions)" };
    const cls = classifyStockToken(issuer, v.symbol!, v.name!);
    if (!cls.ok) return { ...v, issuer, reason: cls.reason };
    return { ...v, issuer, ticker: cls.ticker, company: cls.company, type: cls.type, accepted: true, reason: `verified: ${provenance}` };
  });
}

async function solanaAccounts(mints: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  for (let i = 0; i < mints.length; i += 100) {
    const chunk = mints.slice(i, i + 100);
    const d = await getJson(SOLANA_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [chunk, { encoding: "jsonParsed" }] }),
    });
    d.result.value.forEach((acc: any, j: number) => out.set(chunk[j], acc?.data?.parsed?.info ?? null));
    await sleep(500);
  }
  return out;
}

async function verifySolana(list: Candidate[]): Promise<Verdict[]> {
  const infos = await solanaAccounts([XSTOCK_REFERENCE, ...list.map((c) => c.address)]);
  const meta = (info: any) => info?.extensions?.find((e: any) => e.extension === "tokenMetadata")?.state;
  const ref = infos.get(XSTOCK_REFERENCE);
  const refMint = ref?.mintAuthority;
  const refUpdate = meta(ref)?.updateAuthority;
  if (!refMint || !refUpdate) throw new Error("could not read the reference xStock's authorities");
  return list.map((cand) => {
    const info = infos.get(cand.address);
    const m = meta(info);
    const base: Verdict = { chain: "Solana", address: cand.address, sources: [...cand.sources], name: m?.name, symbol: m?.symbol, accepted: false, reason: "" };
    if (!info || !m) return { ...base, reason: "no on-chain token metadata" };
    if (info.mintAuthority !== refMint || m.updateAuthority !== refUpdate) return { ...base, reason: "authorities differ from genuine xStocks" };
    base.issuer = "xstocks";
    const cls = classifyStockToken("xstocks", m.symbol, m.name);
    if (!cls.ok) return { ...base, reason: cls.reason };
    return { ...base, ticker: cls.ticker, company: cls.company, type: cls.type, accepted: true, reason: "verified" };
  });
}

// ---------------------------------------------------------------- main

function yamlEntry(e: RegistryEntry): string {
  const q = (s: string) => JSON.stringify(s);
  return `- chain: ${e.chain}\n  address: ${q(e.address)}\n  symbol: ${e.symbol}\n  underlying: ${e.underlying}\n  issuer: ${e.issuer}\n  name: ${q(e.name)}\n`;
}

async function main() {
  const registry = parse(fs.readFileSync(REGISTRY, "utf8")) as RegistryEntry[];
  const known = new Set(registry.map((t) => `${t.chain}:${norm(t.address)}`));

  // Reference beacon per issuer and chain, from tokens already in the registry.
  const reference = new Map<string, IssuerId>();
  for (const chain of Object.keys(EVM)) {
    const c = createPublicClient({ transport: http(EVM[chain].rpc, { retryCount: 3 }) });
    for (const t of registry.filter((r) => r.chain === chain && !/^(few\s+)?wrapped/i.test(r.name))) {
      const slot = await c.getStorageAt({ address: t.address as Address, slot: BEACON_SLOT }).catch(() => undefined);
      if (slot && BigInt(slot) !== BigInt(0)) reference.set(`${chain}:0x${slot.slice(-40)}`, t.issuer);
    }
  }
  console.log(`reference beacons: ${[...reference].map(([k, v]) => `${v}@${k.split(":")[0]}`).join(", ")}`);

  for (const [label, fn] of [["raydium", fromRaydium], ["aero", fromAero], ["gecko", fromGecko], ["defillama", fromDefiLlama]] as const) {
    const before = candidates.size;
    try {
      await fn();
      console.log(`[${label}] +${candidates.size - before} candidates`);
    } catch (err) {
      console.error(`[${label}] FAILED: ${err}`);
    }
  }

  const fresh = [...candidates.values()].filter((c) => !known.has(`${c.chain}:${c.address}`));
  console.log(`${candidates.size} candidates, ${fresh.length} not yet in the registry`);

  const verdicts: Verdict[] = [];
  verdicts.push(...(await verifySolana(fresh.filter((c) => c.chain === "Solana"))));
  for (const chain of Object.keys(EVM)) verdicts.push(...(await verifyEvm(chain, fresh.filter((c) => c.chain === chain), reference)));

  const accepted = verdicts.filter((v) => v.accepted);
  const reasons: Record<string, number> = {};
  for (const v of verdicts.filter((x) => !x.accepted)) reasons[v.reason.replace(/:.*/, "")] = (reasons[v.reason.replace(/:.*/, "")] ?? 0) + 1;
  console.log(`accepted ${accepted.length}; rejected:`, reasons);

  fs.writeFileSync(
    REVIEW,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), accepted, rejected: verdicts.filter((v) => !v.accepted && v.name) },
      null,
      1,
    ) + "\n",
  );

  if (!WRITE) return;

  // Registry: existing entries minus wrapped tokens (out of scope), plus new ones.
  const kept = registry.filter((t) => !/^(few\s+)?wrapped/i.test(t.name) && !/^(fw|w)[A-Z]/.test(t.symbol));
  const added: RegistryEntry[] = accepted.map((v) => ({
    chain: v.chain,
    address: v.address,
    symbol: v.issuer === "robinhood" ? `${v.ticker} (Robinhood)` : v.symbol!,
    underlying: v.ticker!,
    issuer: v.issuer!,
    name: v.name!.replace(/&amp;/g, "&"),
  }));
  const all = [...kept, ...added].sort((a, b) => a.chain.localeCompare(b.chain) || a.underlying.localeCompare(b.underlying));
  const header = fs.readFileSync(REGISTRY, "utf8").split("\n").filter((l) => l.startsWith("#")).join("\n");
  fs.writeFileSync(REGISTRY, `${header}\n\n${all.map(yamlEntry).join("")}`);

  // Underlyings not in the seed: one entry per ticker with a canonical name and type.
  const seeded = new Set(loadSeed().underlying_assets.map((a) => a.ticker));
  const byTicker = new Map<string, { names: string[]; type: string }>();
  for (const v of accepted) {
    if (seeded.has(v.ticker!)) continue;
    const e = byTicker.get(v.ticker!) ?? { names: [], type: v.type! };
    e.names.push(v.company!);
    if (v.type === "etf") e.type = "etf";
    byTicker.set(v.ticker!, e);
  }
  const existing: { ticker: string; name: string; type: string }[] = fs.existsSync(UNDERLYINGS) ? parse(fs.readFileSync(UNDERLYINGS, "utf8")) ?? [] : [];
  const merged = new Map(existing.map((u) => [u.ticker, u]));
  for (const [ticker, e] of byTicker) if (!merged.has(ticker)) merged.set(ticker, { ticker, name: canonicalCompany(e.names), type: e.type });
  const lines = [...merged.values()]
    .sort((a, b) => a.ticker.localeCompare(b.ticker))
    .map((u) => `- ticker: ${u.ticker}\n  name: ${JSON.stringify(u.name)}\n  type: ${u.type}\n`);
  fs.writeFileSync(
    UNDERLYINGS,
    "# Assets discovered by scripts/discover-stock-tokens.ts that are not in seed.yaml.\n" +
      "# Generated, then reviewed: edit names freely, re-running keeps existing entries.\n\n" +
      lines.join(""),
  );
  console.log(`registry: ${kept.length} kept + ${added.length} added; underlyings.yaml: ${merged.size} assets`);
}

main();
