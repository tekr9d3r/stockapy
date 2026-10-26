import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import { OpportunityTable } from "./OpportunityTable";
import { Stat, StatStrip } from "./Stat";
import { getRows, marketStats, rowsForTicker } from "@/lib/data/rows";
import { formatApy, formatDate, formatUsd } from "@/lib/format";
import { loadLatestSnapshot } from "@/lib/data/snapshot";

/**
 * Live data a post can embed. The numbers in a published article stay current
 * because they are read at render time, not typed into the prose.
 */
export function LiveTable({ ticker }: { ticker?: string }) {
  const rows = ticker ? rowsForTicker(ticker) : getRows();
  return (
    <div className="not-prose my-6">
      <OpportunityTable rows={rows} compact />
    </div>
  );
}

export function LiveStats({ ticker }: { ticker?: string }) {
  const rows = ticker ? rowsForTicker(ticker) : getRows();
  const stats = marketStats(rows);
  const asOf = formatDate(loadLatestSnapshot()?.fetchedAt ?? null);
  const organic = stats.organicShare === null ? "—" : `${(stats.organicShare * 100).toFixed(1)}%`;

  return (
    <div className="not-prose my-6">
      <StatStrip>
        <Stat label="Opportunities" value={String(stats.opportunityCount)} />
        <Stat label="Median earn APY" value={formatApy(stats.medianApy)} tone="warn" />
        <Stat label="Real interest" value={organic} tone="warn" />
        <Stat label="Total value" value={formatUsd(stats.tvlUsd)} note={`As of ${asOf}`} />
      </StatStrip>
    </div>
  );
}

export const mdxComponents: MDXComponents = {
  LiveTable,
  LiveStats,
  h2: (props) => <h2 className="mt-10 mb-3 text-2xl tracking-tight" {...props} />,
  h3: (props) => <h3 className="mt-6 mb-2 text-lg font-medium" {...props} />,
  p: (props) => <p className="my-4 text-[17px] leading-relaxed" {...props} />,
  ul: (props) => <ul className="my-4 list-disc space-y-1.5 pl-5 text-[17px]" {...props} />,
  ol: (props) => <ol className="my-4 list-decimal space-y-1.5 pl-5 text-[17px]" {...props} />,
  strong: (props) => <strong className="font-semibold text-fg" {...props} />,
  blockquote: (props) => (
    <blockquote className="my-5 border-l-2 border-fg pl-4 font-[family-name:var(--font-display)] text-lg italic" {...props} />
  ),
  code: (props) => <code className="rounded bg-bg-subtle px-1 py-0.5 text-[13px]" {...props} />,
  table: (props) => (
    <div className="my-5 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-b bg-bg-subtle px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-fg-muted" {...props} />
  ),
  td: (props) => <td className="border-b px-3 py-2 text-fg-muted last:border-0" {...props} />,
  a: ({ href = "", ...props }) =>
    href.startsWith("/") ? (
      <Link href={href} className="text-accent underline underline-offset-2" {...props} />
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className="text-accent underline underline-offset-2"
        {...props}
      />
    ),
};
