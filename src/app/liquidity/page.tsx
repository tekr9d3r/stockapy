import type { Metadata } from "next";
import Link from "next/link";
import { CategoryTabs } from "@/components/CategoryTabs";
import { JsonLd } from "@/components/JsonLd";
import { LiquidityExplorer } from "@/components/LiquidityExplorer";
import { Stat, StatStrip } from "@/components/Stat";
import { getLiquidityRows, liquidityStats, loadLiquidityFile } from "@/lib/data/liquidity";
import { marketStats } from "@/lib/data/rows";
import { formatApy, formatDate, formatUsd } from "@/lib/format";
import { breadcrumbLd, datasetLd, faqLd } from "@/lib/seo/jsonld";
import { BRAND_NAME } from "@/config";

export const revalidate = 3600;

const DESCRIPTION =
  "Every DEX pool that pairs a tokenized stock, with trading fees and incentives shown " +
  "separately, volume, TVL and the risks that come with providing liquidity. Updated hourly.";

export const metadata: Metadata = {
  title: "Provide liquidity with tokenized stocks",
  description: DESCRIPTION,
  alternates: { canonical: "/liquidity" },
  openGraph: { title: `Provide liquidity with tokenized stocks · ${BRAND_NAME}`, description: DESCRIPTION },
};

export default function LiquidityPage() {
  const rows = getLiquidityRows();
  const stats = liquidityStats(rows);
  const earn = marketStats();
  const fetchedAt = loadLiquidityFile()?.fetchedAt ?? null;
  const asOf = formatDate(fetchedAt);
  const feePct = stats.feeShare === null ? null : stats.feeShare * 100;
  const earnPct = earn.organicShare === null ? null : earn.organicShare * 100;
  const best = stats.bestFeeLiquid;

  const faq = [
    {
      question: "Can you provide liquidity with a tokenized stock?",
      answer:
        `Yes. As of ${asOf} we track ${stats.allLiveCount} live pools pairing a tokenized stock ` +
        `across ${stats.venues.length} venues and ${stats.chains.length} chains. Among stock/stablecoin ` +
        `pools of at least $10k, the median trading-fee APY is ${formatApy(stats.medianFeeApy)}, ` +
        `before impermanent loss.`,
    },
    {
      question: "Is liquidity-provider yield on tokenized stocks real?",
      answer:
        `The trading-fee part is: traders pay it on every swap. Weighted by pool size, ` +
        `${feePct === null ? "—" : `${feePct.toFixed(1)}%`} of the yield on stock/stablecoin pools is ` +
        `trading fees and the rest is incentives. That is far more real yield than lending a tokenized ` +
        `stock, but it is earned while carrying impermanent loss, which lending does not.`,
    },
    {
      question: "What is the main risk of providing liquidity with a tokenized stock?",
      answer:
        "Impermanent loss: when the stock moves, the pool sells the winner and buys the loser, so " +
        "you end with less of whichever side went up. Tokenized stocks add a second risk: the " +
        "underlying exchange closes but the pool does not, and liquidity providers absorb the price " +
        "gap when the market reopens.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          datasetLd({
            name: "Tokenized stock liquidity pools",
            description: DESCRIPTION,
            url: "/liquidity",
            modified: fetchedAt,
            variables: ["Fee APY", "Incentive APY", "TVL in USD", "24h volume", "Fee tier", "Pool type"],
          }),
          faqLd(faq),
          breadcrumbLd([
            { name: BRAND_NAME, path: "/" },
            { name: "Liquidity", path: "/liquidity" },
          ]),
        ]}
      />

      <CategoryTabs active="liquidity" />

      <section className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Provide liquidity with tokenized stocks
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-fg-muted">
          This is the one category where a tokenized stock can earn real yield: traders pay a fee
          on every swap. As of {asOf}, the median stock/stablecoin pool pays{" "}
          <strong className="text-fg">{formatApy(stats.medianFeeApy)}</strong> in trading fees
          {best && (
            <>
              , and the best one with real depth is{" "}
              <strong className="text-fg">{best.legs.map((l) => l.stock?.symbol ?? l.symbol).join(" / ")}</strong> on{" "}
              {best.venue.name} at <strong className="text-fg">{formatApy(best.apyBase)}</strong> on{" "}
              {formatUsd(best.tvlUsd)}
            </>
          )}
          . Weighted by pool size,{" "}
          <strong className="text-fg">{feePct === null ? "—" : `${feePct.toFixed(1)}%`}</strong> of LP
          yield is trading fees — against{" "}
          <strong className="text-fg">{earnPct === null ? "—" : `${earnPct.toFixed(1)}%`}</strong> of
          yield that is real interest on <Link href="/" className="text-accent underline underline-offset-2">Earn</Link>.
          Every figure here is <strong className="text-fg">before impermanent loss</strong>, which
          lending does not carry.
        </p>
      </section>

      <section className="mb-8">
        <StatStrip>
          <Stat
            label="Stablecoin pools"
            value={String(stats.poolCount)}
            note={`${stats.venues.length} venues · ${stats.chains.length} chains`}
          />
          <Stat label="Median fee APY" value={formatApy(stats.medianFeeApy)} note="Before impermanent loss" />
          <Stat
            label="Yield that is trading fees"
            value={feePct === null ? "—" : `${feePct.toFixed(1)}%`}
            note={`vs ${earnPct === null ? "—" : `${earnPct.toFixed(1)}%`} real interest on Earn`}
            tone="warn"
          />
          <Stat label="Total value in these pools" value={formatUsd(stats.tvlUsd)} note={`${formatUsd(stats.volumeUsd1d)} traded in 24h across the ${stats.volumeReportingCount} pools that report it`} />
        </StatStrip>
      </section>

      <section className="mb-12">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Every pool we track</h2>
          <p className="text-xs text-fg-subtle">
            Refreshed hourly · last run {asOf} ·{" "}
            <Link href="/methodology#liquidity" className="underline hover:text-fg">how we collect this</Link>
          </p>
        </div>
        <LiquidityExplorer rows={rows} />
      </section>

      <section className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Explainer title="Fees are real yield">
          Trading fees are paid by traders on every swap, not by a marketing budget. That makes this
          the one category where the base rate on a tokenized stock can be large and durable — for as
          long as people keep trading the pair.
        </Explainer>
        <Explainer title="Impermanent loss">
          Put $500 of NVDA and $500 of USDC in a pool. If NVDA rises 30%, the pool rebalances by
          selling NVDA: you end with about 12% fewer shares and hold $1,140, against $1,150 had you
          just held — a $10 shortfall your fees have to cover. Bigger moves cost far more, and
          concentrated positions magnify it.
        </Explainer>
        <Explainer title="Markets close, pools don't">
          The stock exchange shuts on Friday; the pool keeps trading. Its price drifts on thin
          weekend flow, and when the market reopens arbitrageurs trade it back to the real price —
          against the liquidity providers. This gap is specific to tokenized stocks.
        </Explainer>
        <Explainer title="Concentrated liquidity">
          On Uniswap v3/v4, Orca, Raydium CLMM, Aerodrome Slipstream and similar, you earn only while
          the price stays inside the range you chose. The APY shown assumes you stay in range; out of
          range you earn nothing and hold only the losing side.
        </Explainer>
        <Explainer title="High APY on thin pools">
          A busy pool with little in it shows a spectacular fee rate that disappears as soon as more
          money arrives. Pools under $10k are hidden by default, and pairs against memecoins are
          flagged speculative: you would hold half your position in that token.
        </Explainer>
      </section>

      <section className="max-w-3xl">
        <h2 className="mb-4 text-lg font-semibold">Common questions</h2>
        <dl className="space-y-5">
          {faq.map((entry) => (
            <div key={entry.question}>
              <dt className="font-medium">{entry.question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fg-muted">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
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
