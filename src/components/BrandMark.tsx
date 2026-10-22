/** The StockAPY mark: a rising bar chart on the accent plate. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <rect x="7" y="17" width="4.5" height="8" rx="1.5" fill="#fff" opacity="0.6" />
      <rect x="13.75" y="12" width="4.5" height="13" rx="1.5" fill="#fff" opacity="0.8" />
      <rect x="20.5" y="7" width="4.5" height="18" rx="1.5" fill="#fff" />
    </svg>
  );
}
