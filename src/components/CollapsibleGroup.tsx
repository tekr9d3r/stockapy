import { StockLogo } from "./StockLogo";

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
    <details className="group overflow-hidden rounded-lg border bg-bg-raised">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-bg-subtle [&::-webkit-details-marker]:hidden">
        {logo}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{title}</span>
            {badges}
          </div>
          <p className="mt-0.5 truncate text-xs text-fg-subtle">{subtitle}</p>
        </div>

        {tickers && tickers.length > 0 && (
          <div className="hidden items-center -space-x-1.5 lg:flex">
            {tickers.slice(0, 5).map((ticker) => (
              <span key={ticker} className="rounded-[4px] ring-2 ring-bg-raised">
                <StockLogo ticker={ticker} size={18} />
              </span>
            ))}
            {tickers.length > 5 && (
              <span className="pl-2.5 text-[11px] text-fg-subtle">+{tickers.length - 5}</span>
            )}
          </div>
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
      <div className="border-t bg-bg-subtle/40 px-4 py-4">{children}</div>
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
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="tnum text-sm font-semibold">{children}</div>
    </div>
  );
}
