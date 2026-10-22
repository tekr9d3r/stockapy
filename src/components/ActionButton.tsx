import { ExternalLink } from "lucide-react";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

/**
 * The outbound action on a row: Deposit, Borrow. Always opens a new tab, and says
 * so three ways: the icon, a tooltip and screen-reader text. When we only have a
 * platform's home page rather than the exact market, it says "Open {platform}"
 * in a quieter style, so a generic link never poses as a specific deposit.
 */
export function ActionButton({
  href,
  platform,
  category,
  specific = true,
  label,
  size = "sm",
}: {
  href: string;
  platform: string;
  category: CategoryKey;
  /** False when the link is the platform's general page, not this market. */
  specific?: boolean;
  label?: string;
  size?: "sm" | "md";
}) {
  const c = CATEGORIES[category];
  const text = specific ? (label ?? c.action) : `Open ${platform}`;
  const pad = size === "md" ? "h-9 px-3.5 text-sm" : "h-7 px-2.5 text-xs";
  const tone = specific
    ? `${c.cls.bg} text-on-category hover:opacity-90`
    : "border border-border-strong bg-bg-raised text-fg hover:bg-bg-subtle";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener nofollow"
      title={
        specific
          ? `${text} on ${platform} — opens in a new tab`
          : `${platform}'s site — we have no link to this exact market yet. Opens in a new tab.`
      }
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-semibold transition ${pad} ${tone}`}
    >
      {text}
      <ExternalLink aria-hidden="true" size={size === "md" ? 14 : 12} strokeWidth={2.25} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
