/**
 * The four sections of the site. Each has one colour, used for its icon, page
 * header, buttons and bars, so a visitor learns the map by colour. Class names
 * are spelled out in full so Tailwind can see them.
 */
export type CategoryKey = "earn" | "liquidity" | "borrow" | "hub";

export type Category = {
  key: CategoryKey;
  href: string;
  label: string;
  /** Longer name for headings. */
  title: string;
  hint: string;
  /** What the outbound button says on this category's rows. */
  action: string;
  cls: { text: string; bg: string; subtle: string; border: string; hoverBg: string };
};

export const CATEGORIES: Record<CategoryKey, Category> = {
  earn: {
    key: "earn",
    href: "/earn",
    label: "Earn",
    title: "Earn",
    hint: "Deposit the stock, get paid",
    action: "Deposit",
    cls: { text: "text-earn", bg: "bg-earn", subtle: "bg-earn-subtle", border: "border-earn", hoverBg: "hover:bg-earn-subtle" },
  },
  liquidity: {
    key: "liquidity",
    href: "/liquidity",
    label: "Liquidity",
    title: "Provide liquidity",
    hint: "Pair it, earn trading fees",
    action: "Deposit",
    cls: { text: "text-liquidity", bg: "bg-liquidity", subtle: "bg-liquidity-subtle", border: "border-liquidity", hoverBg: "hover:bg-liquidity-subtle" },
  },
  borrow: {
    key: "borrow",
    href: "/borrow",
    label: "Borrow",
    title: "Borrow against it",
    hint: "Post it as collateral",
    action: "Borrow",
    cls: { text: "text-borrow", bg: "bg-borrow", subtle: "bg-borrow-subtle", border: "border-borrow", hoverBg: "hover:bg-borrow-subtle" },
  },
  hub: {
    key: "hub",
    href: "/hub",
    label: "Knowledge Hub",
    title: "Knowledge Hub",
    hint: "Research and explainers",
    action: "Read",
    cls: { text: "text-hub", bg: "bg-hub", subtle: "bg-hub-subtle", border: "border-hub", hoverBg: "hover:bg-hub-subtle" },
  },
};

export const NAV_CATEGORIES: CategoryKey[] = ["earn", "liquidity", "borrow", "hub"];
