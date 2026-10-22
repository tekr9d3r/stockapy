"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CategoryIcon } from "./CategoryIcon";
import { CATEGORIES, NAV_CATEGORIES } from "@/lib/categories";

/** The four sections, with the current one highlighted in its colour. */
export function NavLinks({ vertical = false }: { vertical?: boolean }) {
  const path = usePathname() ?? "/";
  return (
    <>
      {NAV_CATEGORIES.map((key) => {
        const c = CATEGORIES[key];
        const on = path === c.href || path.startsWith(`${c.href}/`);
        return (
          <Link
            key={key}
            href={c.href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              on ? `${c.cls.subtle} text-fg` : "text-fg-muted hover:bg-bg-subtle hover:text-fg"
            } ${vertical ? "py-2.5" : ""}`}
          >
            <CategoryIcon category={key} size={16} strokeWidth={2.25} />
            {c.label}
          </Link>
        );
      })}
    </>
  );
}
