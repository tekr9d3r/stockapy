import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

const TABS = (["earn", "liquidity", "borrow"] as const).map((key) => CATEGORIES[key]);

/**
 * The three things you can do with a tokenized stock, as one switcher on each
 * page. Mobile only: on wider screens the main nav already shows them.
 */
export function CategoryTabs({ active }: { active: "earn" | "liquidity" | "borrow" }) {
  return (
    <nav aria-label="Category" className="mb-6 grid grid-cols-3 border-y md:hidden">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-center transition-colors ${
              on ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg"
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
