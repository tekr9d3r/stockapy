import type { Metadata } from "next";
import Link from "next/link";
import { CategoryTabs } from "@/components/CategoryTabs";
import { JsonLd } from "@/components/JsonLd";
import { LiquidityExplorer } from "@/components/LiquidityExplorer";
import { CategoryHeader, LogoStack, Tile } from "@/components/CategoryHeader";
import { ChainLogo, PlatformLogo } from "@/components/Logo";
import { getLiquidityRows, liquidityStats, loadLiquidityFile } from "@/lib/data/liquidity";
import { marketStats } from "@/lib/data/rows";
import { formatApy, formatDate, formatUsd } from "@/lib/format";
import { breadcrumbLd, datasetLd, faqLd } from "@/lib/seo/jsonld";
import { BRAND_NAME } from "@/config";

export const revalidate = 3600;

const DESCRIPTION =
  "Active Raydium, Uniswap and Aero pools that pair a tokenized stock: trading-fee APY that " +
  "reaches liquidity providers, volume, TVL, a direct deposit link and the risks. Updated hourly.";

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
  const best = stats.bestFeeLiquid;
  const busiest = stats.busiest;
  const pairName = (r: { legs: { symbol: string; stock: { symbol: string } | null }[] }) =>
    r.legs.map((l) => l.symbol).join(" / ");

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
        title="Provide liquidity with tokenized stocks"
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
              label="Median fee APY to LPs"
              value={formatApy(stats.medianFeeApy)}
              note={`${stats.feePoolCount} pools with a full day of data · ${formatApy(earn.medianApy)} on Earn`}
            />
            <Tile label="Active stablecoin pools" value={String(stats.poolCount)} note={`${stats.venues.length} venues · ${stats.chains.length} chains`} />
            <Tile label="Traded in 24h" value={formatUsd(stats.volumeUsd1d)} note="Across these pools" />
            <Tile label="Value in these pools" value={formatUsd(stats.tvlUsd)} note={`As of ${asOf}`} />
          </>
        }
      >
        {/* Answer-first: the paragraph a search engine or AI assistant should lift. */}
        <p>
          This is the one category where a tokenized stock can earn real yield: traders pay a fee on
          every swap. We track the active pools on Raydium, Uniswap and Aero. As of {asOf}, the median
          stock/stablecoin pool pays liquidity providers{" "}
          <strong className="text-fg">{formatApy(stats.medianFeeApy)}</strong> in trading fees —
          against <strong className="text-fg">{formatApy(earn.medianApy)}</strong> for the median
          venue on <Link href="/earn" className="text-accent underline underline-offset-2">Earn</Link>
          {best && (
            <>
              . The best with real depth is{" "}
              <strong className="text-fg">{pairName(best)}</strong> on {best.venue.name} ({best.chain})
              at <strong className="text-fg">{formatApy(best.apyBase)}</strong> on {formatUsd(best.tvlUsd)}
            </>
          )}
          {busiest && (
            <>
              , and the busiest pool, {pairName(busiest)} on {busiest.venue.name}, traded{" "}
              {formatUsd(busiest.volumeUsd1d)} in a day
            </>
          )}
          . Every figure is <strong className="text-fg">before impermanent loss</strong>, which lending
          does not carry.
        </p>
      </CategoryHeader>

      <section className="mb-12">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Every active pool</h2>
          <p className="text-xs text-fg-subtle">
            Refreshed hourly · last run {asOf} ·{" "}
            <Link href="/methodology#liquidity" className="underline hover:text-fg">how we collect this</Link>
          </p>
        </div>
        <LiquidityExplorer rows={rows} />
      </section>

      <section className="mb-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Explainer title="Fees are real yield">
          Trading fees are paid by traders on every swap, not by a marketing budget. That makes this
          the one category where the rate on a tokenized stock can be large and durable — for as long
          as people keep trading the pair.
        </Explainer>
        <Explainer title="Who keeps the fees">
          Not always the LP. Raydium keeps 16% of every fee, and the rates here are after that cut —
          Raydium&rsquo;s own figure is not. Uniswap charges a protocol fee on some pools, not deducted
          here. Aero sends 5% of unstaked LPs&rsquo; fees to sAERO Token Operators, deducted here;
          LPs who stake for AERO emissions give up the fees entirely.
        </Explainer>
        <Explainer title="Impermanent loss">
          Put $500 of NVDA and $500 of USDC in a pool. If NVDA rises 30%, the pool rebalances by
          selling NVDA: you end with about 12% fewer shares and hold $1,140, against $1,150 had you
          just held — a $10 shortfall your fees have to cover. Bigger moves cost far more, and
          concentrated positions magnify it.
        </Explainer>
        <Explainer title="Markets close, pools don't">
          The stock exchange shuts on Friday; the pool keeps trading. Its price drifts on thin weekend
          flow, and when the market reopens arbitrageurs trade it back to the real price — against the
          liquidity providers. This gap is specific to tokenized stocks.
        </Explainer>
        <Explainer title="Concentrated liquidity">
          On Uniswap v3 and v4, Raydium CLMM and Aero CL pools you earn only while the price stays
          inside the range you chose. The APY shown assumes you stay in range; out of range you earn
          nothing and hold only the losing side.
        </Explainer>
        <Explainer title="Busy today, quiet tomorrow">
          We list only pools that traded at least $1,000 in the last 24 hours and hold $10k or more.
          A day&rsquo;s volume still swings: a pool on a heavy news day can show a rate it will not
          repeat. Pairs against memecoins are flagged speculative — you would hold half your position
          in that token.
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
    <div className="rounded-xl border bg-bg-raised p-5">
      <h3 className="mb-1.5 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-fg-muted">{children}</p>
    </div>
  );
}
