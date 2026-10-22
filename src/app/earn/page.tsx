import type { Metadata } from "next";
import Link from "next/link";
import { CategoryHeader, LogoStack, Tile } from "@/components/CategoryHeader";
import { CategoryTabs } from "@/components/CategoryTabs";
import { JsonLd } from "@/components/JsonLd";
import { PlatformLogo } from "@/components/Logo";
import { PlatformList } from "@/components/PlatformList";
import { getRows, marketStats, platformGroups } from "@/lib/data/rows";
import { loadSeed } from "@/lib/data/seed";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { formatApy, formatDate, formatUsd } from "@/lib/format";
import { breadcrumbLd, datasetLd, itemListLd } from "@/lib/seo/jsonld";
import { BRAND_NAME, REFRESH_INTERVAL_SECONDS } from "@/config";

export const revalidate = 3600;

const DESCRIPTION =
  "Every place that pays you to deposit a tokenized stock — xStocks, Ondo, Coinbase, Robinhood " +
  "and Binance tokens across DeFi and CeFi — with interest and incentives shown separately. Updated hourly.";

export const metadata: Metadata = {
  title: "Earn yield on tokenized stocks",
  description: DESCRIPTION,
  alternates: { canonical: "/earn" },
  openGraph: { title: `Earn yield on tokenized stocks · ${BRAND_NAME}`, description: DESCRIPTION },
};

export default function EarnPage() {
  const rows = getRows();
  const stats = marketStats(rows);
  // Earn is where the stock itself is paid. Collateral-only venues are on Borrow.
  const earnRows = rows.filter((r) => r.category === "earn");
  const groups = platformGroups(earnRows);
  const earnTvl = earnRows
    .filter((r) => r.status === "live")
    .reduce((sum, r) => sum + (r.tvlUsd ?? 0), 0);
  const seed = loadSeed();
  const snapshot = loadLatestSnapshot();
  const asOf = formatDate(snapshot?.fetchedAt ?? null);

  const organicPct = stats.organicShare === null ? null : stats.organicShare * 100;

  return (
    <>
      <JsonLd
        data={[
          datasetLd({
            name: `Tokenized stock yield opportunities`,
            description: DESCRIPTION,
            url: "/earn",
            modified: snapshot?.fetchedAt ?? null,
            variables: ["APY", "Base APY", "Reward APY", "TVL in USD", "Lockup", "Chain"],
          }),
          itemListLd(rows, "Tokenized stock yield opportunities"),
          breadcrumbLd([
            { name: BRAND_NAME, path: "/" },
            { name: "Earn", path: "/earn" },
          ]),
        ]}
      />

      <CategoryTabs active="earn" />

      <CategoryHeader
        category="earn"
        title="Earn yield on tokenized stocks"
        logos={
          <LogoStack caption={`${groups.length} platforms, ${new Set(earnRows.map((r) => r.chain)).size} chains`}>
            {groups.map((g) => (
              <PlatformLogo key={g.platform.id} id={g.platform.id} name={g.platform.name} size={30} />
            ))}
          </LogoStack>
        }
        tiles={
          <>
            <Tile
              category="earn"
              label="Best rate"
              value={formatApy(stats.maxApy)}
              note={stats.best ? `${stats.best.platform.name} · ${stats.best.token.symbol}` : undefined}
            />
            <Tile
              tone="warn"
              label="Median rate"
              value={formatApy(stats.medianApy)}
              note={`${stats.zeroCount} of ${stats.earnCount} pay exactly 0%`}
            />
            <Tile
              tone="warn"
              label="Real interest"
              value={organicPct === null ? "—" : `${organicPct.toFixed(1)}%`}
              note={`of the yield, across ${stats.splitKnownCount} venues that disclose it`}
            />
            <Tile label="Deposited" value={formatUsd(earnTvl)} note={`As of ${asOf}`} />
          </>
        }
      >
        {/* Answer-first: the paragraph a search engine or AI assistant should lift. */}
        <p>
          As of {asOf}, {BRAND_NAME} tracks {stats.earnCount} places that pay you to deposit a
          tokenized stock. The best advertised rate is{" "}
          <strong className="text-fg">{formatApy(stats.maxApy)}</strong>
          {stats.best && <> on {stats.best.platform.name} ({stats.best.token.symbol})</>}, but the
          median pays <strong className="text-fg">{formatApy(stats.medianApy)}</strong>, and only{" "}
          <strong className="text-fg">{organicPct === null ? "—" : `${organicPct.toFixed(1)}%`}</strong> of
          the yield on offer is interest paid by borrowers; the rest is token incentives that can stop.
          {stats.endedCount > 0 && <> {stats.endedCount} programmes have already ended and stay on record.</>}
        </p>
      </CategoryHeader>

      <section id="table" className="mb-12 scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {groups.length} platforms pay you to deposit a tokenized stock
          </h2>
          <p className="text-xs text-fg-subtle">
            Refreshed hourly · last run {asOf} ·{" "}
            <Link href="/methodology" className="underline hover:text-fg">
              how we collect this
            </Link>
          </p>
        </div>
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-fg-muted">
          Each row is a platform, with its best rate and the total deposited across its
          markets. Open one to see every individual market behind those numbers. &ldquo;Up
          to&rdquo; is the highest rate on offer there, not what a typical deposit earns.
        </p>
        <PlatformList groups={groups} />
        <p className="mt-3 text-xs text-fg-subtle">
          Prefer one flat table?{" "}
          <Link href="/opportunities" className="underline hover:text-fg">
            See all {rows.length} markets
          </Link>
          .
        </p>
      </section>

      <section className="mb-12 grid gap-4 md:grid-cols-3">
        <Explainer title="Base is the only yield that is really yours">
          Base APY is interest that borrowers pay. It is the part that survives when an incentive
          programme ends. On tokenized stock markets it is currently close to zero almost
          everywhere, because very few people want to borrow against a tokenized share.
        </Explainer>
        <Explainer title="A big number usually means borrowed risk">
          The highest rates on this page come from vaults that can deposit your stock, borrow a
          stablecoin against it and loop. Where they do, that multiplies an incentive programme —
          and adds a liquidation price an ordinary share has never had. Check each vault&rsquo;s
          allocation: some hold the stock and nothing else.
        </Explainer>
        <Explainer title="Borrowing is the bigger opportunity">
          Lending a tokenized stock out pays almost nothing, but posting it as collateral and
          borrowing against it is what most of these venues are built for. See the{" "}
          <Link href="/borrow" className="text-accent underline underline-offset-2">
            borrow comparison
          </Link>{" "}
          for max LTV and the cost of each loan.
        </Explainer>

        <Explainer title="Incentives stop, and we keep the receipts">
          When a programme ends we do not delete the row. It stays with its last known rate,
          struck through and marked Ended, and it is excluded from every figure above. A
          venue that paid {stats.endedCount > 0 ? "2–4%" : "well"} and then stopped is the
          clearest evidence there is that an incentive is not a yield.
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
    <div className="rounded-xl border bg-bg-raised p-5">
      <h3 className="mb-1.5 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-fg-muted">{children}</p>
    </div>
  );
}
