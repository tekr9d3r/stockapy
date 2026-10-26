/**
 * The four sections of the site. Labels lead with plain English for readers who
 * know brokers, not DeFi; `term` is the crypto name, shown as a subline so the
 * word is learned. `tradfi` is the nearest thing a stock investor already knows.
 * Class names are spelled out in full so Tailwind can see them.
 */
export type CategoryKey = "earn" | "liquidity" | "borrow" | "hub";

export type Category = {
  key: CategoryKey;
  href: string;
  label: string;
  /** Longer name for headings. */
  title: string;
  /** The crypto name for the same thing. */
  term: string;
  hint: string;
  /** The traditional-finance equivalent, in one line. */
  tradfi: string;
  /** The Knowledge Hub lesson that explains this category. */
  lesson: string;
  /** What the outbound button says on this category's rows. */
  action: string;
  cls: { text: string; bg: string; subtle: string; border: string; hoverBg: string };
};

export const CATEGORIES: Record<CategoryKey, Category> = {
  earn: {
    key: "earn",
    href: "/earn",
    label: "Lend",
    title: "Lend your stock",
    term: "Earn",
    hint: "Deposit the stock, get paid a rate",
    tradfi: "Like a securities-lending programme: you lend the shares out and collect a fee.",
    lesson: "earning-on-tokenized-stocks-what-to-know",
    action: "Deposit",
    cls: { text: "text-earn", bg: "bg-earn", subtle: "bg-earn-subtle", border: "border-earn", hoverBg: "hover:bg-earn-subtle" },
  },
  liquidity: {
    key: "liquidity",
    href: "/liquidity",
    label: "Market-make",
    title: "Act as a market maker",
    term: "Liquidity",
    hint: "Pair it with cash, earn trading fees",
    tradfi: "Like a market maker's spread: you supply both sides of a trade and keep a fee on each one.",
    lesson: "providing-liquidity-with-tokenized-stocks",
    action: "Deposit",
    cls: { text: "text-liquidity", bg: "bg-liquidity", subtle: "bg-liquidity-subtle", border: "border-liquidity", hoverBg: "hover:bg-liquidity-subtle" },
  },
  borrow: {
    key: "borrow",
    href: "/borrow",
    label: "Borrow",
    title: "Borrow against your stock",
    term: "Borrow",
    hint: "Raise cash without selling",
    tradfi: "Like a margin or Lombard loan: the shares are collateral, you borrow cash against them.",
    lesson: "borrowing-against-tokenized-stocks-risks",
    action: "Borrow",
    cls: { text: "text-borrow", bg: "bg-borrow", subtle: "bg-borrow-subtle", border: "border-borrow", hoverBg: "hover:bg-borrow-subtle" },
  },
  hub: {
    key: "hub",
    href: "/hub",
    label: "Learn",
    title: "Knowledge Hub",
    term: "Knowledge Hub",
    hint: "A short course, then research",
    tradfi: "Start here if you know stocks but not crypto.",
    lesson: "what-is-a-tokenized-stock",
    action: "Read",
    cls: { text: "text-hub", bg: "bg-hub", subtle: "bg-hub-subtle", border: "border-hub", hoverBg: "hover:bg-hub-subtle" },
  },
};

export const NAV_CATEGORIES: CategoryKey[] = ["earn", "liquidity", "borrow", "hub"];
