import { Badge } from "./Badge";
import { OpportunityTable } from "./OpportunityTable";
import { PlatformLogo } from "./PlatformLogo";
import { StockLogo } from "./StockLogo";
import { formatApy, formatLtv, formatUsd } from "@/lib/format";
import type { PlatformGroup } from "@/lib/data/rows";

/**
 * Platform-level view of the data. Native <details> rather than a JS accordion:
 * every market stays in the server HTML for crawlers and answer engines, and it
 * works with the keyboard and with JavaScript off.
 */
export function PlatformList({ groups }: { groups: PlatformGroup[] }) {
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <PlatformRow key={group.platform.id} group={group} />
      ))}
    </div>
  );
}

function PlatformRow({ group }: { group: PlatformGroup }) {
  const { platform, rows, topApy, lowApy, flatApy } = group;
  const liveRows = rows.filter((r) => r.status === "live");
  const everythingUnmeasured = liveRows.length > 0 && group.unmeasuredCount === liveRows.length;

  return (
    <details className="group overflow-hidden rounded-lg border bg-bg-raised">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-bg-subtle [&::-webkit-details-marker]:hidden">
        <PlatformLogo id={platform.id} name={platform.name} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{platform.name}</span>
            <Badge tone={platform.kind === "cefi" ? "accent" : "neutral"}>
              {platform.kind === "cefi" ? "CeFi" : "DeFi"}
            </Badge>
            {group.allEnded && (
              <Badge tone="ended" title="Every programme we tracked here has stopped paying.">
                Ended
              </Badge>
            )}
            {group.collateralOnly && !group.allEnded && (
              <Badge tone="warn" title="Nothing here pays you for holding the stock.">
                Collateral only
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-fg-subtle">
            {group.marketCount} {group.marketCount === 1 ? "market" : "markets"} ·{" "}
            {group.chains.join(", ")} · {group.stocks.length}{" "}
            {group.stocks.length === 1 ? "stock" : "stocks"}
            {group.endedCount > 0 && !group.allEnded && (
              <> · {group.endedCount} ended</>
            )}
          </p>
        </div>

        {/* Stock logos as a quick visual index of what the platform covers. */}
        <div className="hidden items-center -space-x-1.5 lg:flex">
          {group.stocks.slice(0, 5).map((ticker) => (
            <span key={ticker} className="rounded-[4px] ring-2 ring-bg-raised">
              <StockLogo ticker={ticker} size={18} />
            </span>
          ))}
          {group.stocks.length > 5 && (
            <span className="pl-2.5 text-[11px] text-fg-subtle">
              +{group.stocks.length - 5}
            </span>
          )}
        </div>

        <Metric label="APY" wide always>
          {group.allEnded ? (
            <span className="text-sm font-normal text-fg-subtle">no longer paying</span>
          ) : everythingUnmeasured ? (
            <span className="text-sm font-normal text-fg-subtle">not collected</span>
          ) : (
            <>
              <span
                className={
                  topApy === 0 ? "text-zero" : topApy && topApy > 10 ? "text-warn" : "text-positive"
                }
              >
                {topApy === 0 ? "0%" : `up to ${formatApy(topApy)}`}
              </span>
              {!flatApy && lowApy !== null && topApy !== 0 && (
                <span className="block text-[11px] font-normal text-fg-subtle">
                  from {formatApy(lowApy)}
                </span>
              )}
            </>
          )}
        </Metric>

        <Metric label="TVL">
          {group.tvlUsd === null ? (
            <span className="text-sm font-normal text-fg-subtle">n/d</span>
          ) : (
            formatUsd(group.tvlUsd)
          )}
        </Metric>

        <Metric label="Max LTV">
          {group.maxLtv === null ? (
            <span className="text-sm font-normal text-fg-subtle">—</span>
          ) : (
            <>
              {formatLtv(group.maxLtv)}
              {group.cheapestBorrowApr !== null && (
                <span className="block text-[11px] font-normal text-fg-subtle">
                  at {group.cheapestBorrowApr.toFixed(2)}%
                </span>
              )}
            </>
          )}
        </Metric>

        <svg
          className="size-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden="true"
        >
          <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="border-t bg-bg-subtle/40 px-4 py-4">
        <p className="mb-3 max-w-3xl text-sm leading-relaxed text-fg-muted">
          {platform.description}
        </p>
        {group.allEnded && rows[0]?.endedNote && (
          <p className="mb-3 max-w-3xl rounded-md border border-border-strong bg-bg-subtle px-3 py-2 text-sm leading-relaxed text-fg-muted">
            <strong className="text-fg">No longer paying.</strong> {rows[0].endedNote}
          </p>
        )}
        <OpportunityTable rows={rows} compact hidePlatform />
        <a
          href={platform.website}
          target="_blank"
          rel="noopener nofollow"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          Open {platform.name} →
        </a>
      </div>
    </details>
  );
}

function Metric({
  label,
  children,
  wide = false,
  /** The rate is the point of the row, so it stays visible at phone width. */
  always = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
  always?: boolean;
}) {
  return (
    <div
      className={`shrink-0 text-right ${always ? "" : "hidden sm:block"} ${
        wide ? "w-24 sm:w-28" : "w-20"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="tnum text-sm font-semibold">{children}</div>
    </div>
  );
}
