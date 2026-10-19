import { formatApy, formatPp } from "@/lib/format";
import type { Row } from "@/lib/data/types";

/**
 * The headline number plus its split. Showing base and reward apart is the whole
 * point of the site, so a bare total never appears without the breakdown.
 */
export function ApyCell({ row }: { row: Row }) {
  if (row.unmeasured) {
    return (
      <span className="text-fg-subtle" title="We have not collected a rate for this yet.">
        not collected
      </span>
    );
  }

  const total = row.apyTotal ?? 0;
  const reward = row.apyReward ?? 0;
  const mostlyIncentives = total > 0 && reward / total > 0.5;

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className={`tnum text-[15px] font-semibold ${
          total === 0 ? "text-zero" : mostlyIncentives ? "text-warn" : "text-positive"
        }`}
      >
        {formatApy(total)}
      </span>
      {mostlyIncentives && (
        <span
          className="text-[10px] font-medium uppercase tracking-wide text-warn"
          title={`${formatPp(reward)} of ${formatPp(total)} percentage points come from token incentives, which can stop at any time.`}
        >
          incentive
        </span>
      )}
    </span>
  );
}
