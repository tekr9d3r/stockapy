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
          Liquidity pools containing a tokenized stock. Fee APY is paid by traders; incentives are
          shown separately. All rates are before impermanent loss.
        </caption>
        <thead>
          <tr className="border-b bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-muted">
            <th scope="col" className="px-2 py-2 pl-4 font-medium">Stock</th>
            <th scope="col" className="px-2 py-2 font-medium">Pair</th>
            {!hideVenue && <th scope="col" className="px-2 py-2 font-medium">Venue</th>}
            <th scope="col" className="px-2 py-2 font-medium">Chain</th>
            <th scope="col" className="px-2 py-2 text-right font-medium" title="Trading fees paid by traders. The real yield in this category.">
              Fee APY
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium" title="Token incentives on top of fees. Can stop at any time.">
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
            const ended = r.status === "ended";
            const pool = POOL_TYPE[r.poolType] ?? POOL_TYPE.unknown;
            return (
              <tr key={r.id} className={`border-b last:border-0 hover:bg-bg-subtle ${ended ? "opacity-60" : ""}`}>
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
                    <span className="font-medium">{r.legs.map((l) => l.stock?.symbol ?? l.symbol).join(" / ")}</span>
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
                    {ended && (
                      <Badge tone="ended" title={`This pool emptied or disappeared${r.endedOn ? ` on ${r.endedOn}` : ""}. Last known figures shown.`}>
                        Ended
                      </Badge>
                    )}
                  </div>
                </td>
                {!hideVenue && (
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <a href={r.url} target="_blank" rel="noopener nofollow" className="flex items-center gap-1.5 font-medium hover:text-accent hover:underline">
                      <PlatformLogo id={r.venue.id} name={r.venue.name} size={18} />
                      {r.venue.name}
                      {r.variant && <span className="text-xs font-normal text-fg-subtle">{r.variant}</span>}
                      <span aria-hidden="true" className="text-fg-subtle">↗</span>
                    </a>
                  </td>
                )}
                <td className="px-2 py-2.5 whitespace-nowrap text-fg-muted">{r.chain}</td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap">
                  {r.apyBase === null ? (
                    <span className="text-fg-subtle">—</span>
                  ) : ended ? (
                    <span className="text-fg-subtle line-through">{formatApy(r.apyBase)}</span>
                  ) : (
                    <span className={`text-[15px] font-semibold ${r.apyBase > 0 ? "text-positive" : "text-zero"}`}>
                      {formatApy(r.apyBase)}
                    </span>
                  )}
                </td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap text-fg-muted">
                  {r.apyReward === null ? "—" : formatApy(r.apyReward)}
                </td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap">
                  {r.apyTotal === null ? (
                    <span className="text-fg-subtle">—</span>
                  ) : (
                    <span className="inline-flex items-baseline gap-1">
                      <span className={ended ? "text-fg-subtle line-through" : r.mostlyIncentives ? "text-warn" : "text-fg"}>
                        {formatApy(r.apyTotal)}
                      </span>
                      {r.mostlyIncentives && !ended && (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-warn" title="More than half of this rate is incentives, which can stop at any time.">
                          incentive
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap text-fg-muted">{formatUsd(r.tvlUsd)}</td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap text-fg-muted">
                  {r.volumeUsd1d === null ? "—" : formatUsd(r.volumeUsd1d)}
                </td>
                <td className="tnum px-2 py-2.5 text-right whitespace-nowrap text-fg-muted">
                  {r.volumeToTvl === null ? "—" : `${r.volumeToTvl.toFixed(2)}×`}
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap text-xs text-fg-muted" title={pool.title}>
                  {pool.label}
                </td>
                <td className="px-2 py-2.5 pr-4 text-right text-xs whitespace-nowrap text-fg-subtle">
                  <a
                    href={r.chartUrl}
                    target="_blank"
                    rel="noopener nofollow"
                    title={`Collected ${formatDate(r.fetchedAt)} from DefiLlama. Opens this pool's history.`}
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
