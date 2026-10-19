import type { Metadata } from "next";
import Link from "next/link";
import { getRows } from "@/lib/data/rows";
import { loadSeed } from "@/lib/data/seed";
import { formatApy, formatUsd } from "@/lib/format";
import { Badge } from "@/components/Badge";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Platforms that accept tokenized stocks",
  description:
    "Every DeFi protocol and CeFi platform that accepts a tokenized stock, what it pays, " +
    "and what it does with your position. Updated hourly.",
  alternates: { canonical: "/platforms" },
};

export default function PlatformsPage() {
  const seed = loadSeed();
  const rows = getRows();

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Platforms</h1>
      <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-fg-muted">
        {seed.platforms.length} venues accept a tokenized stock. They do very different things
        with it: some lend it out, some only hold it as collateral, and some borrow against it on
        your behalf. The difference matters more than the rate.
      </p>

      <div className="mt-8 space-y-4">
        {seed.platforms.map((platform) => {
          const platformRows = rows.filter((r) => r.platform.id === platform.id);
          const measured = platformRows.filter((r) => !r.unmeasured);
          const best = measured.length
            ? measured.reduce((a, b) => ((b.apyTotal ?? 0) > (a.apyTotal ?? 0) ? b : a))
            : null;
          const tvl = platformRows.reduce((sum, r) => sum + (r.tvlUsd ?? 0), 0);

          return (
            <section key={platform.id} className="rounded-lg border bg-bg-raised p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  <a
                    href={platform.website}
                    target="_blank"
                    rel="noopener nofollow"
                    className="hover:text-accent hover:underline"
                  >
                    {platform.name}
                  </a>
                </h2>
                <div className="flex items-center gap-2">
                  <Badge tone={platform.kind === "cefi" ? "accent" : "neutral"}>
                    {platform.kind === "cefi" ? "CeFi" : "DeFi"}
                  </Badge>
                  <span className="tnum text-sm text-fg-muted">
                    {platformRows.length} {platformRows.length === 1 ? "market" : "markets"}
                    {best && ` · best ${formatApy(best.apyTotal)}`}
                    {tvl > 0 && ` · ${formatUsd(tvl)}`}
                  </span>
                </div>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted">
                {platform.description}
              </p>

              {platformRows.length > 0 && (
                <p className="mt-3 text-sm text-fg-subtle">
                  Stocks:{" "}
                  {[...new Set(platformRows.map((r) => r.underlying.ticker))].map((t, i) => (
                    <span key={t}>
                      {i > 0 && ", "}
                      <Link href={`/stock/${t.toLowerCase()}`} className="hover:text-accent hover:underline">
                        {t}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
