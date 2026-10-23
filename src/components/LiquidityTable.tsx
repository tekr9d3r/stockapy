import { ActionButton } from "./ActionButton";
import { Badge } from "./Badge";
import { ChainLogo, PlatformLogo } from "./Logo";
import { StockLogo } from "./StockLogo";
import { formatApy, formatRelativeShort, formatUsd } from "@/lib/format";
import type { LiquidityRow } from "@/lib/data/liquidity";

const POOL_TYPE: Record<string, { label: string; title: string } | undefined> = {
  concentrated: {
    label: "Concentrated",
    title: "Concentrated liquidity: the rate only applies while the price is inside your range. The APY shown assumes you stay in range.",
  },
  "full-range": { label: "Full range", title: "Liquidity spread across every price." },
};

const SOURCE_LABEL: Record<LiquidityRow["source"], string> = {
  "raydium-api": "Raydium's API",
  geckoterminal: "GeckoTerminal",
  "aero-sugar": "Aero's Sugar contract on-chain",
};

/**
 * Liquidity pools, one row each. Fee APY leads because trading fees are the part
 * paid by traders; incentives sit under it and are never folded in silently.
 * Below `md` each row becomes a card.
 */
export function LiquidityTable({ rows, hideVenue = false }: { rows: LiquidityRow[]; hideVenue?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-bg-raised md:overflow-x-auto">
      <table className="block w-full border-collapse text-sm md:table md:min-w-[820px]">
        <caption className="sr-only">
          Active liquidity pools containing a tokenized stock. Fee APY is what reaches the
          liquidity provider. All rates are before impermanent loss.
        </caption>
        <thead className="hidden md:table-header-group">
          <tr className="border-b bg-bg-subtle text-left text-[11px] uppercase tracking-wide text-fg-muted">
            <th scope="col" className="px-2 py-2 pl-4 font-medium">Stock</th>
            <th scope="col" className="px-2 py-2 font-medium">Pool</th>
            <th scope="col" className="px-2 py-2 font-medium">Chain</th>
            <th scope="col" className="px-2 py-2 text-right font-medium" title="Trading fees that reach the liquidity provider, before impermanent loss. Hover a figure for how it was worked out.">
              Fee APY
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">TVL</th>
            <th scope="col" className="px-2 py-2 text-right font-medium" title="Volume traded in the last 24 hours, and how many times over it turned the pool's TVL.">
              24h volume
            </th>
            <th scope="col" className="px-2 py-2 pr-4 text-right font-medium">
              <span className="sr-only">Open pool</span>
            </th>
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {rows.map((r) => {
            const pool = POOL_TYPE[r.poolType];
            const updated = `Updated ${formatRelativeShort(r.fetchedAt)} ago from ${SOURCE_LABEL[r.source]}.`;
            return (
              <tr key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 border-b px-4 py-3 last:border-0 hover:bg-bg-subtle md:table-row md:p-0">
                <td className="md:px-2 md:py-2.5 md:pl-4">
                  <div className="flex items-center gap-2">
                    {r.underlyings.map((t) =>
                      r.linkable.includes(t) ? (
                        <a key={t} href={`/stock/${t.toLowerCase()}`} className="flex items-center gap-2 font-semibold hover:text-accent">
                          <StockLogo ticker={t} size={28} />
                          {t}
                        </a>
                      ) : (
                        <span key={t} className="flex items-center gap-2 font-semibold">
                          <StockLogo ticker={t} size={28} />
                          {t}
                        </span>
                      ),
                    )}
                  </div>
                </td>
                <td className="col-start-1 row-start-2 md:px-2 md:py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{r.legs.map((l) => l.symbol).join(" / ")}</span>
                    {r.feeTier !== null && (
                      <span className="tnum rounded bg-bg-subtle px-1 text-[11px] text-fg-subtle" title="Fee tier: what each swap pays the pool.">
                        {r.feeTier}%
                      </span>
                    )}
                    {r.pairType === "stock-other" && (
                      <Badge tone="warn" title="The other side is a small or speculative token. Its price can collapse, and you hold half of it.">
                        Speculative
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-fg-subtle">
                    {!hideVenue && (
                      <>
                        <PlatformLogo id={r.venue.id} name={r.venue.name} size={14} />
                        <span>{r.venue.name}</span>
                      </>
                    )}
                    {r.variant && <span>{r.variant}</span>}
                    {pool && <span title={pool.title}>· {pool.label}</span>}
                    <span className="flex items-center gap-1 md:hidden">
                      · <ChainLogo chain={r.chain === "BSC" ? "BNB Chain" : r.chain} size={12} /> {r.chain}
                    </span>
                  </div>
                </td>
                <td className="hidden whitespace-nowrap text-fg-muted md:table-cell md:px-2 md:py-2.5">
                  <span className="flex items-center gap-1.5">
                    <ChainLogo chain={r.chain === "BSC" ? "BNB Chain" : r.chain} size={16} />
                    {r.chain}
                  </span>
                </td>
                <td className="col-start-2 row-start-1 text-right whitespace-nowrap md:px-2 md:py-2.5" title={`${r.feeNote} ${updated}`}>
                  {r.apyBase === null ? (
                    <span className="text-xs text-fg-subtle">not published</span>
                  ) : (
                    <span className={`text-[15px] font-semibold tabular-nums ${r.apyBase > 0 ? "text-positive" : "text-zero"}`}>
                      {formatApy(r.apyBase)}
                    </span>
                  )}
                  {r.volumeWindowHours != null && (
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-warn">{r.volumeWindowHours}h of data</span>
                  )}
                  {r.emissions ? (
                    <span
                      className="block text-[11px] text-fg-subtle"
                      title={
                        `${formatUsd(r.emissions.usdPerDay)} a day in ${r.emissions.token} to LPs who stake in the gauge, instead of the fees. ` +
                        (r.emissions.venueApr === null
                          ? "Nothing is staked yet."
                          : `Aero shows ${formatApy(r.emissions.venueApr)} APR because only ${formatUsd(r.emissions.stakedUsd)} is staked.`)
                      }
                    >
                      or {formatUsd(r.emissions.usdPerDay)}/day {r.emissions.token}
                    </span>
                  ) : (
                    r.apyReward !== null &&
                    r.apyReward > 0 && <span className="block text-[11px] text-warn">+{formatApy(r.apyReward)} incentives</span>
                  )}
                </td>
                <td className="col-start-1 row-start-3 whitespace-nowrap text-xs text-fg-muted md:table-cell md:px-2 md:py-2.5 md:text-right md:text-sm">
                  <span className="md:hidden">TVL </span>
                  <span className="tnum">{formatUsd(r.tvlUsd)}</span>
                </td>
                <td className="col-start-2 row-start-3 text-right whitespace-nowrap text-xs text-fg-muted md:table-cell md:px-2 md:py-2.5 md:text-sm">
                  <span className="md:hidden">Vol </span>
                  <span className="tnum">{formatUsd(r.volumeUsd1d)}</span>
                  <span className="block text-[10px] text-fg-subtle" title="24h volume divided by TVL: how hard the liquidity is working.">
                    {r.volumeWindowHours != null ? `last ${r.volumeWindowHours}h · ` : ""}
                    {r.volumeToTvl.toFixed(1)}× TVL
                  </span>
                </td>
                <td className="col-start-2 row-start-2 text-right md:px-2 md:py-2.5 md:pr-4">
                  <ActionButton href={r.url} platform={r.venue.name} category="liquidity" />
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr className="block md:table-row">
              <td colSpan={7} className="block px-4 py-10 text-center text-fg-muted md:table-cell">
                Nothing matches those filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
