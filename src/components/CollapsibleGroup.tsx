
/**
 * A venue-level row that opens to reveal its markets. Native <details> rather
 * than a JS accordion: every market stays in the server HTML for crawlers and
 * answer engines, and it works with the keyboard and with JavaScript off.
 * Shared by the Earn platform list and the Liquidity venue list.
 */
export function CollapsibleGroup({
  logo,
  title,
  badges,
  subtitle,
  tickers,
  metrics,
  children,
}: {
  logo: React.ReactNode;
  title: React.ReactNode;
  badges?: React.ReactNode;
  subtitle: React.ReactNode;
  /** Stock logos as a quick visual index of what the group covers. */
  tickers?: string[];
  metrics: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-3.5 hover:bg-bg-subtle/60 [&::-webkit-details-marker]:hidden">
        {logo}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{title}</span>
            {badges}
          </div>
          <p className="mt-0.5 truncate text-xs text-fg-subtle">{subtitle}</p>
        </div>

        {tickers && tickers.length > 0 && (
          <p className="hidden max-w-48 truncate text-xs text-fg-subtle lg:block">
            {tickers.slice(0, 4).join(", ")}
            {tickers.length > 4 && ` +${tickers.length - 4}`}
          </p>
        )}

        {metrics}

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
      <div className="pb-5">{children}</div>
    </details>
  );
}

export function Metric({
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
      <div className="text-[10px] text-fg-subtle">{label}</div>
      <div className="tnum text-sm font-semibold">{children}</div>
    </div>
  );
}
