import { NewsletterForm } from "./NewsletterForm";
import { NEWSLETTER } from "@/config";

const WHAT = ["The best rates, and what changed", "Incentive programmes that started or ended", "The cheapest place to borrow against your stock"];

/** The site-wide call to action above the footer. */
export function NewsletterBand() {
  return (
    <section aria-labelledby="newsletter-band" className="mx-auto mt-16 w-full max-w-7xl px-4">
      <div className="grid items-start gap-8 border-t-2 border-fg pt-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 id="newsletter-band" className="text-3xl tracking-tight">
            {NEWSLETTER.headline}
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-fg-muted">
            {WHAT.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
        <NewsletterForm source="band" />
      </div>
    </section>
  );
}
