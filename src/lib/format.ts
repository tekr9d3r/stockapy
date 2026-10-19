/** Shared number and date formatting. The table is the product, so this matters. */

export function formatApy(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "0%";
  if (value < 0.01) return "<0.01%";
  if (value < 1) return `${value.toFixed(2)}%`;
  return `${value.toFixed(2)}%`;
}

/** Percentage points, for the base/reward split. */
export function formatPp(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "0";
  if (value < 0.01) return "<0.01";
  return value.toFixed(2);
}

export function formatUsd(value: number | null): string {
  if (value === null) return "Not disclosed";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${Math.round(value)}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRelative(iso: string | null): string {
  if (!iso) return "not collected yet";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "unknown";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export const CATEGORY_LABEL: Record<string, string> = {
  earn: "Earn",
  collateral: "Collateral only",
  structured: "Structured",
};

export const LOCKUP_LABEL: Record<string, string> = {
  none: "None",
  days: "Notice period",
  fixed_term: "Fixed term",
};

export const SOURCE_LABEL: Record<string, string> = {
  defillama: "DefiLlama",
  onchain: "On-chain",
  manual: "Checked by hand",
  bybit_api: "Bybit API",
  kraken_api: "Kraken API",
};
