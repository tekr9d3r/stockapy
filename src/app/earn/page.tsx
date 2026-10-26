import type { Metadata } from "next";
import Link from "next/link";
import { CategoryHeader, LogoStack, Tile } from "@/components/CategoryHeader";
import { CategoryTabs } from "@/components/CategoryTabs";
import { InfoTip } from "@/components/InfoTip";
import { JsonLd } from "@/components/JsonLd";
import { LearnMore } from "@/components/LearnMore";
import { PlatformLogo } from "@/components/Logo";
import { PlatformList } from "@/components/PlatformList";
import { getRows, marketStats, platformGroups } from "@/lib/data/rows";
import { loadSeed } from "@/lib/data/seed";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { formatApy, formatDate, formatUsd } from "@/lib/format";
import { breadcrumbLd, datasetLd, itemListLd } from "@/lib/seo/jsonld";
import { BRAND_NAME, OG_IMAGE } from "@/config";

export const revalidate = 3600;

const DESCRIPTION =
  "Every place that pays you to deposit a tokenized stock — xStocks, Ondo, Coinbase, Robinhood " +
  "and Binance tokens across DeFi and CeFi — with interest and incentives shown separately. Updated hourly.";

export const metadata: Metadata = {
  title: "Earn yield on tokenized stocks",
  description: DESCRIPTION,
  alternates: {
    canonical: "/earn",
    types: { "text/markdown": "/earn.md", "application/json": "/api/v1/earn" },
  },
  openGraph: { images: [OG_IMAGE], title: `Lend your tokenized stock and earn a yield · ${BRAND_NAME}`, description: DESCRIPTION },
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
        title="Lend your tokenized stock and earn a yield"
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
              label="Best yield (yearly)"
              value={formatApy(stats.maxApy)}
              note={stats.best ? `${stats.best.platform.name} · ${stats.best.token.symbol}` : undefined}
            />
            <Tile
              tone="warn"
              label="Typical yield"
              value={formatApy(stats.medianApy)}
              note={`${stats.zeroCount} of ${stats.earnCount} pay exactly 0%`}
            />
            <Tile
              tone="warn"
              label="Paid by borrowers"
              value={organicPct === null ? "—" : `${organicPct.toFixed(1)}%`}
              note={`of the yield, across ${stats.splitKnownCount} venues that disclose it`}
            />
            <Tile label="Money deposited" value={formatUsd(earnTvl)} note={`As of ${asOf}`} />
          </>
        }
      >
        {/* Answer-first: the sentence a search engine or AI assistant should lift. */}
        <p>
          As of {asOf}: up to <strong className="text-fg">{formatApy(stats.maxApy)}</strong> across{" "}
          {stats.earnCount} venues, but the median pays{" "}
          <strong className="text-fg">{formatApy(stats.medianApy)}</strong> and only{" "}
          {organicPct === null ? "—" : `${organicPct.toFixed(1)}%`} of the yield is real interest.
        </p>
      </CategoryHeader>

      <section id="table" className="mb-12 scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {groups.length} platforms
            <InfoTip text="Each row is a platform, with its best rate and the total deposited across its markets. Open one for every market behind those numbers. “Up to” is the highest rate on offer, not what a typical deposit earns." />
          </h2>
          <p className="text-xs text-fg-subtle">
            Updated {asOf} ·{" "}
            <Link href="/methodology" className="underline hover:text-fg">
              methodology
            </Link>
          </p>
        </div>
        <PlatformList groups={groups} />
        <p className="mt-3 text-xs text-fg-subtle">
          <Link href="/opportunities" className="underline hover:text-fg">
            All {rows.length} markets in one table
          </Link>
        </p>
      </section>

      <LearnMore
        posts={["earning-on-tokenized-stocks-what-to-know", "base-apy-vs-reward-apy-vs-points"]}
        terms={["base-apy", "reward-apy", "looped-vault", "collateral-only"]}
      />

      {seed.watchlist.length > 0 && (
        <details className="mt-8 border-y py-3.5">
          <summary className="cursor-pointer text-sm font-medium text-fg-muted">
            Watchlist: {seed.watchlist.length} venues we have not confirmed yet
          </summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {seed.watchlist.map((item) => (
              <li key={item.platform} className="rounded-lg border p-3 text-sm">
                <span className="font-medium">{item.platform}</span>{" "}
                <span className="text-xs text-fg-subtle">{item.chain} · {item.status}</span>
                <p className="mt-1 text-fg-muted">{item.note}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
