import Link from "next/link";

const TABS = [
  { href: "/", key: "earn", label: "Earn", hint: "Deposit the stock, get paid" },
  { href: "/liquidity", key: "liquidity", label: "Liquidity", hint: "Pair it, earn trading fees" },
  { href: "/borrow", key: "borrow", label: "Borrow", hint: "Post it as collateral" },
] as const;

/** The three things you can do with a tokenized stock, as one switcher on each page. */
export function CategoryTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Category" className="mb-6 grid grid-cols-3 gap-1 rounded-lg border bg-bg-subtle p-1">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-center transition-colors ${
              on ? "bg-bg-raised shadow-sm ring-1 ring-border" : "text-fg-muted hover:text-fg"
            }`}
          >
            <span className="block text-sm font-semibold">{t.label}</span>
            <span className="hidden text-[11px] text-fg-subtle sm:block">{t.hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}
