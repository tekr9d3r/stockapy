import { getHomeData } from "@/lib/data/home";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { formatApy, formatDate, formatLtv } from "@/lib/format";

/** The headline numbers, the same ones every page's answer sentence quotes. */
export function getSummary() {
  const d = getHomeData();
  const asOf = formatDate(loadLatestSnapshot()?.fetchedAt ?? null);
  return {
    asOf,
    answer:
      `As of ${asOf}: earn up to ${formatApy(d.earn.maxApy)} by depositing a tokenized stock (median ` +
      `${formatApy(d.earn.medianApy)}), a median ${formatApy(d.lq.medianFeeApy)} in trading fees by providing ` +
      `liquidity, or borrow at up to ${formatLtv(d.borrow.maxLtv)} loan-to-value.`,
    earn: {
      venues: d.earn.earnCount,
      maxApy: d.earn.maxApy,
      medianApy: d.earn.medianApy,
      /** Share of deposit yield that is interest rather than incentives, 0–1. */
      interestShare: d.earn.organicShare,
      zeroCount: d.earn.zeroCount,
      endedCount: d.earn.endedCount,
    },
    liquidity: {
      activePools: d.lq.allCount,
      stablePools: d.lq.poolCount,
      medianFeeApy: d.lq.medianFeeApy,
      volumeUsd1d: d.lq.volumeUsd1d,
      tvlUsd: d.lq.tvlUsd,
    },
    borrow: {
      markets: d.borrow.count,
      maxLtv: d.borrow.maxLtv,
      medianBorrowApr: d.borrow.medianApr,
      loanAssets: d.borrow.loanAssets,
    },
    stocks: d.stocks.map((s) => ({
      ticker: s.ticker,
      name: s.name,
      bestEarnApy: s.bestEarn,
      bestLpFeeApy: s.bestFee,
      maxLtv: s.maxLtv,
    })),
  };
}
