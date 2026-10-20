import { loadSeed } from "@/lib/data/seed";
import type { Snapshot } from "@/lib/data/types";

const RPC = "https://rpc-gel.inkonchain.com";
const PRICES = "https://coins.llama.fi/prices/current";

/**
 * Kraken's xStocks Vaults are Veda BoringVaults on Ink, Kraken's own L2.
 *
 * The vault contract exposes only `totalSupply` — it holds none of the
 * underlying directly, and the share price lives in a separate Accountant
 * contract whose address is not published anywhere we could find. So we value
 * the vault at its share supply times the price of the underlying xStock,
 * which assumes one share is one share-of-stock.
 *
 * That slightly UNDERSTATES the vault once it has accrued yield: a vault
 * launched at 1:1 and paying ~2.5% is perhaps 1% above par by now. We publish
 * it because a figure that is correct to about a percent is far better than
 * the "not disclosed" these rows carried before, but it is an on-chain
 * reading, not a number Kraken reports.
 */
const VAULTS: Record<string, { vault: string; underlying: string }> = {
  "kraken-vault-spyx": {
    vault: "0x83b890Ca44fb0355CDF5606617ccA0FE21Ddb16A",
    underlying: "0x90A2a4c76b5D8c0bc892A69EA28Aa775a8f2dD48",
  },
  "kraken-vault-nvdax": {
    vault: "0xBeB4a79e150564857488E6142D26787A78d54a66",
    underlying: "0xc845b2894dBddd03858fd2D643B4eF725fE0849d",
  },
  "kraken-vault-qqqx": {
    vault: "0x6D33D2142a5b0b52856a6902eb6F6203B2232a5b",
    underlying: "0xa753A7395cAe905Cd615Da0B82A53E0560f250af",
  },
};

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  if (!res.ok) throw new Error(`Ink RPC responded ${res.status}`);
  const body = (await res.json()) as { result?: string; error?: { message: string } };
  if (body.error) throw new Error(`Ink RPC: ${body.error.message}`);
  if (!body.result) throw new Error("Ink RPC returned no result");
  return body.result;
}

const TOTAL_SUPPLY = "0x18160ddd";
const DECIMALS = "0x313ce567";

export async function fetchKrakenInk(): Promise<Snapshot[]> {
  const tracked = loadSeed().opportunities.filter((o) => VAULTS[o.id] && o.active);
  if (tracked.length === 0) return [];

  const underlyings = [...new Set(tracked.map((o) => VAULTS[o.id].underlying))];
  const priceRes = await fetch(`${PRICES}/${underlyings.map((a) => `ink:${a}`).join(",")}`);
  if (!priceRes.ok) throw new Error(`Price API responded ${priceRes.status}`);
  const priceBody = (await priceRes.json()) as {
    coins: Record<string, { price: number; symbol: string }>;
  };

  const fetchedAt = new Date().toISOString();
  const snapshots: Snapshot[] = [];

  for (const opp of tracked) {
    const { vault, underlying } = VAULTS[opp.id];
    const price = priceBody.coins[`ink:${underlying}`]?.price;

    const [supplyHex, decHex] = await Promise.all([
      ethCall(vault, TOTAL_SUPPLY),
      ethCall(vault, DECIMALS),
    ]);
    const decimals = parseInt(decHex, 16);
    const shares = Number(BigInt(supplyHex)) / 10 ** decimals;
    if (!Number.isFinite(shares)) continue;

    snapshots.push({
      opportunityId: opp.id,
      // The rate is not on-chain readable, so the APY stays hand-entered.
      apyTotal: null,
      apyBase: null,
      apyReward: null,
      tvlUsd: price ? shares * price : null,
      source: "onchain",
      fetchedAt,
    });
  }

  return snapshots;
}
