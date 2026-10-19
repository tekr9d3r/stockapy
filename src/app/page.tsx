import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { OpportunityTable } from "@/components/OpportunityTable";
import { Stat, StatStrip } from "@/components/Stat";
import { getRows, marketStats } from "@/lib/data/rows";
import { loadSeed } from "@/lib/data/seed";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { formatApy, formatDate, formatUsd } from "@/lib/format";
import { datasetLd, itemListLd, organizationLd, webSiteLd } from "@/lib/seo/jsonld";
import { BRAND_NAME, REFRESH_INTERVAL_SECONDS, SITE_DESCRIPTION } from "@/config";

export const revalidate = 3600;

export default function Home() {
  const rows = getRows();
  const stats = marketStats(rows);
  const seed = loadSeed();
  const snapshot = loadLatestSnapshot();
  const asOf = formatDate(snapshot?.fetchedAt ?? null);

  const organicPct = stats.organicShare === null ? null : stats.organicShare * 100;

  return (
    <>
      <JsonLd
        data={[
          organizationLd(),
          webSiteLd(),
          datasetLd({
            name: `Tokenized stock yield opportunities`,
            description: SITE_DESCRIPTION,
            url: "/",
            modified: snapshot?.fetchedAt ?? null,
            variables: ["APY", "Base APY", "Reward APY", "TVL in USD", "Lockup", "Chain"],
          }),
          itemListLd(rows, "Tokenized stock yield opportunities"),
        ]}
      />

      <section className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Where tokenized stocks actually earn
        </h1>

        {/* Answer-first: the one paragraph a search engine or an AI assistant should lift. */}
        <p className="mt-4 text-[17px] leading-relaxed text-fg-muted">
          {BRAND_NAME} tracks {stats.opportunityCount} places to put a tokenized stock to work,
          across {new Set(rows.map((r) => r.chain)).size} chains and{" "}
          {seed.platforms.length} platforms. As of {asOf}, the highest advertised rate is{" "}
          <strong className="text-fg">{formatApy(stats.maxApy)}</strong>
          {stats.best && (
            <>
              {" "}
              on {stats.best.platform.name} ({stats.best.token.symbol})
            </>
          )}
          , but the median earn opportunity pays{" "}
          <strong className="text-fg">{formatApy(stats.medianApy)}</strong>. Across the{" "}
          {stats.splitKnownCount} venues that disclose where their yield comes from, only{" "}
          <strong className="text-fg">
            {organicPct === null ? "—" : `${organicPct.toFixed(1)}%`}
          </strong>{" "}
          of it is interest paid by borrowers; the rest is token incentives that can stop at
          any time. A further {stats.splitUnknownCount} venues pay a rate without saying what
          funds it.
        </p>
      </section>

      <section className="mb-8">
        <StatStrip>
          <Stat
            label="Opportunities tracked"
            value={String(stats.opportunityCount)}
            note={`${stats.earnCount} earn, rest collateral`}
          />
          <Stat
            label="Median earn APY"
            value={formatApy(stats.medianApy)}
            note={`${stats.zeroCount} of ${stats.earnCount} pay exactly 0%`}
            tone="warn"
          />
          <Stat
            label="Yield that is real interest"
            value={organicPct === null ? "—" : `${organicPct.toFixed(1)}%`}
            note={`Of ${stats.splitKnownCount} venues that disclose it`}
            tone="warn"
          />
          <Stat label="Total value in these venues" value={formatUsd(stats.tvlUsd)} note={`As of ${asOf}`} />
        </StatStrip>
      </section>

      <section id="table" className="mb-12 scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Every opportunity we track</h2>
          <p className="text-xs text-fg-subtle">
            Refreshed hourly · last run {asOf} ·{" "}
            <Link href="/methodology" className="underline hover:text-fg">
              how we collect this
            </Link>
          </p>
        </div>
        <OpportunityTable rows={rows} />
      </section>

      <section className="mb-12 grid gap-6 md:grid-cols-3">
        <Explainer title="Base is the only yield that is really yours">
          Base APY is interest that borrowers pay. It is the part that survives when an incentive
          programme ends. On tokenized stock markets it is currently close to zero almost
          everywhere, because very few people want to borrow against a tokenized share.
        </Explainer>
        <Explainer title="A big number usually means borrowed risk">
          The highest rates on this page come from vaults that deposit your stock, borrow a
          stablecoin against it and loop. That multiplies an incentive programme — and it adds a
          liquidation price that an ordinary share has never had.
        </Explainer>
        <Explainer title="A rate with no stated source is not interest">
          Centralised platforms publish a flat number — Crypto.com pays 2% to 4% on its
          tokenized stocks — without saying whether it is interest, a marketing budget or
          revenue share. We show the rate and leave the split blank rather than guessing, and
          those venues are excluded from the figure above.
        </Explainer>

        <Explainer title="Collateral is not earning">
          Several venues accept tokenized stocks but never lend them out. Your position unlocks
          borrowing power and nothing else. Those rows say 0% because 0% is the truth, not
          because the data is missing.
        </Explainer>
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-lg font-semibold">Watchlist</h2>
        <p className="mb-3 max-w-2xl text-sm text-fg-muted">
          Venues named in research that we have not been able to confirm. They stay out of the
          table until there is a number we can stand behind.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {seed.watchlist.map((item) => (
            <li key={item.platform} className="rounded-lg border bg-bg-raised p-3">
              <div className="flex items-center justify-between gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener nofollow"
                  className="font-medium hover:text-accent hover:underline"
                >
                  {item.platform}
                </a>
                <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
                  {item.chain} · {item.status}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{item.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-fg-subtle">
        Data refreshes every {Math.round(REFRESH_INTERVAL_SECONDS / 60)} minutes. Every number
        carries its source and the time it was collected.
      </p>
    </>
  );
}

function Explainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 font-medium">{title}</h3>
      <p className="text-sm leading-relaxed text-fg-muted">{children}</p>
    </div>
  );
}
