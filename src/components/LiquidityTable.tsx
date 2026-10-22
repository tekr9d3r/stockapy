import { Badge } from "./Badge";
import { PlatformLogo } from "./PlatformLogo";
import { StockLogo } from "./StockLogo";
import { formatApy, formatDate, formatRelativeShort, formatUsd } from "@/lib/format";
import type { LiquidityRow } from "@/lib/data/liquidity";

const POOL_TYPE: Record<string, { label: string; title: string }> = {
  concentrated: {
    label: "Concentrated",
    title: "Concentrated liquidity: the rate only applies while the price is inside your range. The APY shown assumes you stay in range.",
  },
  "full-range": { label: "Full range", title: "Liquidity spread across every price." },
  unknown: { label: "—", title: "The venue does not say which kind of pool this is." },
};

const SOURCE_LABEL: Record<LiquidityRow["source"], string> = {
  "raydium-api": "Raydium's API",
  geckoterminal: "GeckoTerminal",
  "aero-sugar": "Aero's Sugar contract on-chain",
};

const PAIR_LABEL: Record<string, string> = {
  "stock-stable": "Stock / stablecoin",
  "stock-crypto": "Stock / crypto",
  "stock-stock": "Stock / stock",
  "stock-other": "Speculative pair",
};

/**
 * Liquidity pools, one row each. Fee APY leads because trading fees are the part
 * paid by traders; incentives sit beside it and are never folded in silently.
 */
export function LiquidityTable({ rows, hideVenue = false }: { rows: LiquidityRow[]; hideVenue?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-bg-raised">
      <table className={`w-full border-collapse text-sm ${hideVenue ? "min-w-[980px]" : "min-w-[1120px]"}`}>
        <caption className="sr-only">
          Active liquidity pools containing a tokenized stock. Fee APY is what reaches the
          liquidity provider, where the venue publishes it. All rates are before impermanent loss.
        </caption>
        <thead>
          <tr className="border-b bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-muted">
            <th scope="col" className="px-2 py-2 pl-4 font-medium">Stock</th>
            <th scope="col" className="px-2 py-2 font-medium">Pair</th>
            {!hideVenue && <th scope="col" className="px-2 py-2 font-medium">Venue</th>}
            <th scope="col" className="px-2 py-2 font-medium">Chain</th>
            <th scope="col" className="px-2 py-2 text-right font-medium" title="Trading fees that reach the liquidity provider. Hover a figure for how it was worked out.">
              Fee APY
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium" title="Token incentives. Added to fees on most venues; on Aero they replace fees. Can stop at any time.">
              Incentives
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium" title="Fees plus incentives, before impermanent loss.">
              Total
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">TVL</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">24h vol</th>
            <th scope="col" className="px-2 py-2 text-right font-medium" title="24h volume divided by TVL: how hard the liquidity is working.">
              Vol/TVL
            </th>
            <th scope="col" className="px-2 py-2 font-medium">Pool</th>
            <th scope="col" className="px-2 py-2 pr-4 text-right font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pool = POOL_TYPE[r.poolType] ?? POOL_TYPE.unknown;
            return (
              <tr key={r.id} className="border-b last:border-0 hover:bg-bg-subtle">
                <td className="px-2 py-2.5 pl-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {r.underlyings.map((t) => (
                      <a key={t} href={`/stock/${t.toLowerCase()}`} className="flex items-center gap-1.5 font-medium hover:text-accent hover:underline">
                        <StockLogo ticker={t} />
                        {t}
                      </a>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <a href={r.url} target="_blank" rel="noopener nofollow" title={`Deposit into this pool on ${r.venue.name}`} className="font-medium hover:text-accent hover:underline">
                      {r.legs.map((l) => l.symbol).join(" / ")}
                      {hideVenue && <span aria-hidden="true" className="ml-0.5 text-fg-subtle">↗</span>}
                    </a>
                    {hideVenue && r.variant && <span className="text-xs text-fg-subtle">{r.variant}</span>}
                    {r.feeTier !== null && (
                      <span className="tnum rounded bg-bg-subtle px-1 text-[11px] text-fg-subtle" title="Fee tier: what each swap pays the pool.">
                        {r.feeTier}%
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {r.pairType === "stock-other" ? (
                      <Badge tone="warn" title="The other side is a small or speculative token. Its price can collapse, and you hold half of it.">
                        Speculative pair
                      </Badge>
                    ) : (
                      <span className="text-xs text-fg-subtle">{PAIR_LABEL[r.pairType]}</span>
                    )}
                  </div>
                </td>
                {!hideVenue && (
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <a href={r.url} target="_blank" rel="noopener nofollow" title={`Deposit into this pool on ${r.venue.name}`} className="flex items-center gap-1.5 font-medium hover:text-accent hover:underline">
                      <PlatformLogo id={r.venue.id} name={r.venue.name} size={18} />
                      {r.venue.name}
                      {r.variant && <span className="text-xs font-normal text-fg-subtle">{r.variant}</span>}
                      <span aria-hidden="true" className="text-fg-subtle">↗</span>
                    </a>
                  </td>
                )}
                <td className="px-2 py-2.5 whitespace-nowrap text-fg-muted">{r.chain}</td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap" title={r.feeNote}>
                  {r.apyBase === null ? (
                    <span className="text-xs text-fg-subtle underline decoration-dotted underline-offset-2">not published</span>
                  ) : (
                    <>
                      <span className={`text-[15px] font-semibold ${r.apyBase > 0 ? "text-positive" : "text-zero"}`}>
                        {formatApy(r.apyBase)}
                      </span>
                      {r.volumeWindowHours != null && (
                        <span className="block text-[10px] font-medium uppercase tracking-wide text-warn">
                          {r.volumeWindowHours}h of data
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap text-fg-muted">
                  {r.emissions ? (
                    <span
                      title={
                        `${formatUsd(r.emissions.usdPerDay)} a day in ${r.emissions.token}, shared by LPs who stake in the gauge, ` +
                        `who give up the trading fees in exchange. ` +
                        (r.emissions.venueApr === null
                          ? "Nothing is staked yet."
                          : `Aero shows this as ${formatApy(r.emissions.venueApr)} APR because only ${formatUsd(r.emissions.stakedUsd)} ` +
                            `of the pool is staked; it falls as soon as more LPs stake.`)
                      }
                      className="underline decoration-dotted underline-offset-2"
                    >
                      {formatUsd(r.emissions.usdPerDay)}/day
                      <span className="block text-[10px] text-fg-subtle">{r.emissions.token}, instead of fees</span>
                    </span>
                  ) : r.apyReward === null ? (
                    "—"
                  ) : (
                    formatApy(r.apyReward)
                  )}
                </td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap">
                  {r.apyTotal === null ? (
                    <span
                      className="text-fg-subtle"
                      title={r.emissions ? "No total: on Aero you take the trading fees or the AERO emissions, not both." : undefined}
                    >
                      —
                    </span>
                  ) : (
                    <span className="inline-flex items-baseline gap-1">
                      <span className={r.mostlyIncentives ? "text-warn" : "text-fg"}>
                        {formatApy(r.apyTotal)}
                      </span>
                      {r.mostlyIncentives && (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-warn" title="More than half of this rate is incentives, which can stop at any time.">
                          incentive
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap text-fg-muted">{formatUsd(r.tvlUsd)}</td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap text-fg-muted">
                  {formatUsd(r.volumeUsd1d)}
                  {r.volumeWindowHours != null && (
                    <span className="block text-[10px] text-fg-subtle" title="Volume over the trading history available so far, not a full day.">
                      last {r.volumeWindowHours}h
                    </span>
                  )}
                </td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap text-fg-muted">
                  {`${r.volumeToTvl.toFixed(2)}×`}
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap text-xs text-fg-muted" title={pool.title}>
                  {pool.label}
                </td>
                <td className="px-2 py-2.5 pr-4 text-right text-xs whitespace-nowrap text-fg-subtle">
                  <a
                    href={r.chartUrl}
                    target="_blank"
                    rel="noopener nofollow"
                    title={`Collected ${formatDate(r.fetchedAt)} from ${SOURCE_LABEL[r.source]}. Opens this pool on GeckoTerminal.`}
                    className="hover:text-accent hover:underline"
                  >
                    {formatRelativeShort(r.fetchedAt)}
                  </a>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={hideVenue ? 11 : 12} className="px-4 py-10 text-center text-fg-muted">
                Nothing matches those filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
