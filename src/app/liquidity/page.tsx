import type { Metadata } from "next";
import Link from "next/link";
import { CategoryTabs } from "@/components/CategoryTabs";
import { Faq } from "@/components/Faq";
import { InfoTip } from "@/components/InfoTip";
import { JsonLd } from "@/components/JsonLd";
import { LearnMore } from "@/components/LearnMore";
import { LiquidityExplorer } from "@/components/LiquidityExplorer";
import { CategoryHeader, LogoStack, Tile } from "@/components/CategoryHeader";
import { ChainLogo, PlatformLogo } from "@/components/Logo";
import { getLiquidityRows, liquidityStats, loadLiquidityFile } from "@/lib/data/liquidity";
import { marketStats } from "@/lib/data/rows";
import { formatApy, formatDate, formatUsd } from "@/lib/format";
import { breadcrumbLd, datasetLd, faqLd } from "@/lib/seo/jsonld";
import { BRAND_NAME, OG_IMAGE } from "@/config";

export const revalidate = 3600;

const DESCRIPTION =
  "Active Raydium, Uniswap and Aero pools that pair a tokenized stock: trading-fee APY that " +
  "reaches liquidity providers, volume, TVL, a direct deposit link and the risks. Updated hourly.";

export const metadata: Metadata = {
  title: "Provide liquidity with tokenized stocks",
  description: DESCRIPTION,
  alternates: {
    canonical: "/liquidity",
    types: { "text/markdown": "/liquidity.md", "application/json": "/api/v1/liquidity" },
  },
  openGraph: { images: [OG_IMAGE], title: `Act as a market maker with your tokenized stock · ${BRAND_NAME}`, description: DESCRIPTION },
};

export default function LiquidityPage() {
  const rows = getLiquidityRows();
  const stats = liquidityStats(rows);
  const earn = marketStats();
  const fetchedAt = loadLiquidityFile()?.fetchedAt ?? null;
  const asOf = formatDate(fetchedAt);

  const faq = [
    {
      question: "Where can you provide liquidity with a tokenized stock?",
      answer:
        `As of ${asOf} we list ${stats.allCount} active pools on Raydium, Uniswap and Aero across ` +
        `${stats.chains.length} chains — pools that traded at least $1,000 in the last 24 hours and ` +
        `hold at least $10k. Among the stock/stablecoin pools with a full day of trading measured, the median ` +
        `trading-fee APY reaching liquidity providers is ${formatApy(stats.medianFeeApy)}, before ` +
        `impermanent loss.`,
    },
    {
      question: "Is liquidity-provider yield on tokenized stocks real?",
      answer:
        "The trading-fee part is: traders pay it on every swap, so it lasts as long as people trade " +
        "the pair. It is far more real yield than lending a tokenized stock, which pays close to " +
        "nothing, but it is earned while carrying impermanent loss, which lending does not.",
    },
    {
      question: "How do Aero pools pay liquidity providers?",
      answer:
        "An Aero LP picks one of two: keep the position unstaked and earn trading fees (minus the 5% " +
        "Aero sends to sAERO Token Operators), or stake it in the pool's gauge and earn AERO emissions " +
        "instead of fees. We show the fee APY over the pool's whole TVL, the same way as for Raydium " +
        "and Uniswap, and the emissions as dollars per day beside it, never added together. Aero's own " +
        "app shows higher figures because it divides fees by the liquidity near the current price only, " +
        "and emissions by the small amount staked so far.",
    },
    {
      question: "What is the main risk of providing liquidity with a tokenized stock?",
      answer:
        "Impermanent loss: when the stock moves, the pool sells the winner and buys the loser, so you " +
        "end with less of whichever side went up. Tokenized stocks add a second risk: the underlying " +
        "exchange closes but the pool does not, and liquidity providers absorb the price gap when the " +
        "market reopens.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          datasetLd({
            name: "Active tokenized stock liquidity pools",
            description: DESCRIPTION,
            url: "/liquidity",
            modified: fetchedAt,
            variables: ["LP fee APY", "TVL in USD", "24h volume", "Fee tier", "Pool type", "Pool address"],
          }),
          faqLd(faq),
          breadcrumbLd([
            { name: BRAND_NAME, path: "/" },
            { name: "Liquidity", path: "/liquidity" },
          ]),
        ]}
      />

      <CategoryTabs active="liquidity" />

      <CategoryHeader
        category="liquidity"
        title="Act as a market maker with your tokenized stock"
        logos={
          <LogoStack caption={`${stats.venues.join(", ")} · ${stats.chains.join(", ")}`}>
            {[...new Map(rows.map((r) => [r.venue.id, r.venue])).values()].map((v) => (
              <PlatformLogo key={v.id} id={v.id} name={v.name} size={30} />
            ))}
            {stats.chains.map((c) => (
              <ChainLogo key={c} chain={c === "BSC" ? "BNB Chain" : c} size={30} />
            ))}
          </LogoStack>
        }
        tiles={
          <>
            <Tile
              category="liquidity"
              label="Typical fee yield"
              value={formatApy(stats.medianFeeApy)}
              note={`${stats.feePoolCount} pools with a full day of data · ${formatApy(earn.medianApy)} on Earn`}
            />
            <Tile label="Active stablecoin pools" value={String(stats.poolCount)} note={`${stats.venues.length} venues · ${stats.chains.length} chains`} />
            <Tile label="Traded in 24h" value={formatUsd(stats.volumeUsd1d)} note="Across these pools" />
            <Tile label="Money in these pools" value={formatUsd(stats.tvlUsd)} note={`As of ${asOf}`} />
          </>
        }
      >
        {/* Answer-first: the sentence a search engine or AI assistant should lift. */}
        <p>
          As of {asOf}: the median stock/stablecoin pool pays LPs{" "}
          <strong className="text-fg">{formatApy(stats.medianFeeApy)}</strong> in trading fees, against{" "}
          {formatApy(earn.medianApy)} for depositing — before impermanent loss.
        </p>
      </CategoryHeader>

      <section className="mb-12">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            Every active pool
            <InfoTip text="Pools that traded at least $1,000 in the last 24 hours and hold $10k or more. Fee APY is what reaches the LP, before impermanent loss; concentrated-liquidity rates assume you stay in range." />
          </h2>
          <p className="text-xs text-fg-subtle">
            Updated {asOf} ·{" "}
            <Link href="/methodology#liquidity" className="underline hover:text-fg">methodology</Link>
          </p>
        </div>
        <LiquidityExplorer rows={rows} />
      </section>

      <LearnMore
        posts={["providing-liquidity-with-tokenized-stocks"]}
        terms={["impermanent-loss", "concentrated-liquidity", "fee-tier", "volume-tvl"]}
      />

      <Faq entries={faq} />
    </>
  );
}
