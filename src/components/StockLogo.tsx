import logos from "../../data/logos.json";

const MANIFEST = logos as Record<string, string>;

/**
 * Self-hosted company mark. Falls back to a monogram when we have no file, so a
 * missing logo never leaves a hole in the table. Dimensions are always explicit
 * to keep the row from shifting while images load.
 */
export function StockLogo({
  ticker,
  name,
  size = 20,
}: {
  ticker: string;
  name?: string;
  size?: number;
}) {
  const file = MANIFEST[ticker];

  if (!file) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        className="inline-flex shrink-0 items-center justify-center rounded-full border bg-bg-subtle font-semibold text-fg-subtle"
      >
        {ticker.slice(0, 2)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local, pre-sized, mostly SVG
    <img
      src={`/logos/${file}`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      title={name ?? ticker}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-[4px] object-contain"
    />
  );
}
