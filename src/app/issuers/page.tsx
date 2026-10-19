import type { Metadata } from "next";
import Link from "next/link";
import { getRows } from "@/lib/data/rows";
import { loadSeed } from "@/lib/data/seed";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Who issues tokenized stocks",
  description:
    "xStocks, Ondo, Coinbase, Robinhood and Binance bStocks compared: what each token " +
    "actually entitles you to, which chain it lives on, and where it can earn.",
  alternates: { canonical: "/issuers" },
};

export default function IssuersPage() {
  const seed = loadSeed();
  const rows = getRows();

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Issuers</h1>
      <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-fg-muted">
        A tokenized stock is a claim on an issuer, not a share. Who that issuer is determines
        what you can redeem, which chain you are on, and whether any venue will take your token
        at all.
      </p>

      <div className="mt-8 space-y-4">
        {seed.issuers.map((issuer) => {
          const issuerTokens = seed.tokens.filter((t) => t.issuer === issuer.id);
          const issuerRows = rows.filter((r) => r.issuer.id === issuer.id);

          return (
            <section key={issuer.id} className="rounded-lg border bg-bg-raised p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  <a
                    href={issuer.website}
                    target="_blank"
                    rel="noopener nofollow"
                    className="hover:text-accent hover:underline"
                  >
                    {issuer.name}
                  </a>
                </h2>
                <span className="text-sm text-fg-muted">
                  {issuerTokens.length} tokens · {issuerRows.length} venues
                </span>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted">
                {issuer.structure_note}
              </p>

              {issuerTokens.length > 0 && (
                <p className="mt-3 text-sm text-fg-subtle">
                  Tokens:{" "}
                  {issuerTokens.map((t, i) => (
                    <span key={t.symbol}>
                      {i > 0 && ", "}
                      <Link
                        href={`/stock/${t.underlying.toLowerCase()}`}
                        className="hover:text-accent hover:underline"
                      >
                        {t.symbol}
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
