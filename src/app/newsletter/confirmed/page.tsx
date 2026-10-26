import type { Metadata } from "next";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { CATEGORIES, NAV_CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "You're subscribed",
  robots: { index: false, follow: true },
};

export default function ConfirmedPage() {
  return (
    <section className="mx-auto max-w-lg py-16 text-center">
      <PartyPopper size={44} aria-hidden="true" className="mx-auto text-positive" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">You&rsquo;re in</h1>
      <p className="mt-3 text-fg-muted">
        Your subscription is confirmed. The next issue lands this week. Meanwhile, the live data:
      </p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {NAV_CATEGORIES.map((k) => (
          <Link key={k} href={CATEGORIES[k].href} className="flex items-center gap-2 rounded-lg border bg-bg-raised px-4 py-3 text-left font-medium hover:border-border-strong">
            {CATEGORIES[k].title}
          </Link>
        ))}
      </div>
    </section>
  );
}
