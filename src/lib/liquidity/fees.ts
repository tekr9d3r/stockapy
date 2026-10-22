/** Fee arithmetic, pure so it can be tested. */

/**
 * Share of each trade fee that Raydium leaves with liquidity providers. Its pool
 * config gives the protocol and fund cuts as parts per million of the trade fee:
 * 120000 + 40000 means 16% goes to Raydium and LPs keep 84%. Raydium's own
 * feeApr is computed on the full fee, so it overstates what an LP earns.
 */
export function raydiumLpShare(config: { protocolFeeRate?: number; fundFeeRate?: number } | null | undefined): number | null {
  if (!config || config.protocolFeeRate == null || config.fundFeeRate == null) return null;
  const share = 1 - (config.protocolFeeRate + config.fundFeeRate) / 1_000_000;
  return share >= 0 && share <= 1 ? share : null;
}

/**
 * Fees a pool generates in a year as a percentage of its TVL, from one day of
 * volume: feeTier% × volume × 365 ÷ TVL. The same arithmetic DefiLlama and
 * Raydium use; it says nothing about who receives the fees.
 */
export function grossFeeApy(feeTierPct: number | null, volume24h: number, tvl: number): number | null {
  if (feeTierPct === null || !(tvl > 0) || !(volume24h >= 0)) return null;
  return (feeTierPct / 100) * volume24h * 365 / tvl * 100;
}
