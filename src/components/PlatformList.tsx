import { ActionButton } from "./ActionButton";
import { Badge } from "./Badge";
import { CollapsibleGroup, Metric } from "./CollapsibleGroup";
import { OpportunityTable } from "./OpportunityTable";
import { PlatformLogo } from "./PlatformLogo";
import { formatApy, formatLtv, formatUsd } from "@/lib/format";
import type { PlatformGroup } from "@/lib/data/rows";

/** Platform-level view of the Earn data, one collapsible row per platform. */
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
    <CollapsibleGroup
      logo={<PlatformLogo id={platform.id} name={platform.name} />}
      title={platform.name}
      badges={
        <>
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
        </>
      }
      subtitle={
        <>
          {group.marketCount} {group.marketCount === 1 ? "market" : "markets"} ·{" "}
          {group.chains.join(", ")} · {group.stocks.length}{" "}
          {group.stocks.length === 1 ? "stock" : "stocks"}
          {group.endedCount > 0 && !group.allEnded && <> · {group.endedCount} ended</>}
        </>
      }
      tickers={group.stocks}
      metrics={
        <>
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
        </>
      }
    >
      <p className="mb-3 max-w-3xl text-sm leading-relaxed text-fg-muted">
        {platform.description}
      </p>
      {group.allEnded && rows[0]?.endedNote && (
        <p className="mb-3 max-w-3xl rounded-md border border-border-strong bg-bg-subtle px-3 py-2 text-sm leading-relaxed text-fg-muted">
          <strong className="text-fg">No longer paying.</strong> {rows[0].endedNote}
        </p>
      )}
      <OpportunityTable rows={rows} compact hidePlatform />
      <div className="mt-3">
        <ActionButton href={platform.website} platform={platform.name} category="earn" specific={false} size="md" />
      </div>
    </CollapsibleGroup>
  );
}
