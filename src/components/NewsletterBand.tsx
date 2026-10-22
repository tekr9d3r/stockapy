import { NewsletterForm } from "./NewsletterForm";
import { NEWSLETTER } from "@/config";

const WHAT = ["Top pools by real fee yield", "New and ended incentive programmes", "Cheapest place to borrow against your stock"];

/** The site-wide call to action above the footer. */
export function NewsletterBand() {
  return (
    <section aria-labelledby="newsletter-band" className="mx-auto mt-16 w-full max-w-7xl px-4">
      <div className="relative overflow-hidden rounded-2xl bg-[#0e1320] px-6 py-10 text-white sm:px-10">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[#2457f5]/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-[#7c3aed]/30 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">{NEWSLETTER.name}</p>
            <h2 id="newsletter-band" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {NEWSLETTER.headline}
            </h2>
            <ul className="mt-4 space-y-1.5 text-sm text-white/80">
              {WHAT.map((w) => (
                <li key={w} className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-[#34d399]" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <NewsletterForm source="band" tone="inverse" />
        </div>
      </div>
    </section>
  );
}
