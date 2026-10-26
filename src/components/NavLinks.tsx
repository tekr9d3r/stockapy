"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES, NAV_CATEGORIES } from "@/lib/categories";

/** The four sections, the current one underlined. Plain words, no icons. */
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
            className={
              vertical
                ? `block px-2.5 py-2.5 text-sm ${on ? "font-semibold text-fg" : "text-fg-muted hover:text-fg"}`
                : `border-b-2 px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                    on ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg"
                  }`
            }
          >
            {c.label}
          </Link>
        );
      })}
    </>
  );
}
