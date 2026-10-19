import type { Metadata } from "next";
import Link from "next/link";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { getRows } from "@/lib/data/rows";
import { loadSeed } from "@/lib/data/seed";
import { formatDate } from "@/lib/format";
import { BRAND_NAME, DISCLAIMER, REFRESH_INTERVAL_SECONDS } from "@/config";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "Where every number on this site comes from, how often it refreshes, what we refuse " +
    "to publish, and the known gaps in our coverage.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  const snapshot = loadLatestSnapshot();
  const rows = getRows();
  const seed = loadSeed();
  const bySource = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Methodology</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-fg-muted">
        {BRAND_NAME} publishes rates on tokenized stocks. This page explains exactly where each
        number comes from, so you can check it yourself.
      </p>

      <Section title="Where the numbers come from">
        <p>
          Most DeFi rates come from the{" "}
          <a href="https://defillama.com/docs/api" target="_blank" rel="noopener" className="underline">
            DefiLlama yields API
          </a>
          , matched to our own list of venues by pool ID rather than by token symbol. Symbols
          collide across chains and issuers — there is a SPY on Robinhood Chain and a wSPYx on
          Ethereum — so a symbol match would quietly mix up two different products.
        </p>
        <p>
          Anything DefiLlama does not cover is entered by hand and labelled as such. Rows sourced
          by hand carry the date a human last checked them.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {Object.entries(bySource).map(([source, count]) => (
            <div key={source} className="rounded border bg-bg-subtle px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-fg-subtle">{source}</dt>
              <dd className="tnum font-medium">{count} rows</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="How often it refreshes">
        <p>
          A scheduled job runs every {Math.round(REFRESH_INTERVAL_SECONDS / 60)} minutes and
          writes a snapshot. The last successful run was{" "}
          <strong className="text-fg">{formatDate(snapshot?.fetchedAt ?? null)}</strong>. Every
          snapshot is committed to version control, so the history of any number on this site can
          be reconstructed.
        </p>
      </Section>

      <Section title="Where the links go">
        <p>
          Each market links to the most specific page we can establish for it, which for most
          DeFi venues is the market or lending page rather than the protocol&rsquo;s front
          door. The arrow marks an outbound link; hovering says whether it is
          market-specific.
        </p>
        <p>
          We do not guess these. Several protocols run isolated markets where the same stock
          and the same loan asset appear more than once at the same loan-to-value, and a link
          that lands on the wrong one of those would point at different risk parameters than
          the row describes. Where we cannot pin the exact market, the link goes to the
          chain-filtered market list instead, and the row is one a human still needs to
          confirm.
        </p>
        <p>
          The timestamp in the last column links to that pool&rsquo;s rate and TVL history on
          DefiLlama, where we read it from. That link is always exact, because the pool id is
          the one we query.
        </p>
      </Section>

      <Section title="Borrow terms">
        <p>
          Aave V4 reserves come from{" "}
          <a href="https://aave.com/docs/aave-v4/getting-started/graphql" target="_blank" rel="noopener" className="underline">
            Aave&rsquo;s own GraphQL API
          </a>
          , which DefiLlama does not index for the equity spokes. It gives the collateral
          factor, the liquidation bonus and the borrow rate on the loan asset directly from the
          protocol. Everything else comes from DefiLlama&rsquo;s lendBorrow endpoint, read from
          the collateral market itself. The borrow cost is the rate on the asset you would actually
          borrow, which is not always the same pool: in a pooled market such as Kamino&rsquo;s
          xStocks Market, the stock reserve&rsquo;s own borrow rate is the cost of borrowing the
          stock, so we point at the stablecoin reserve in that market instead and record which
          pool each rate came from.
        </p>
        <p>
          We do not publish available borrowing liquidity. Supply, borrowed amounts and debt
          ceilings mean different things in a pooled market and an isolated one, and a single
          &ldquo;available&rdquo; column would imply a comparability that is not there.
        </p>
      </Section>

      <Section title="Base, rewards and points are never added up silently">
        <p>
          Base APY is interest paid by borrowers. Reward APY is a token incentive the protocol is
          paying out of its own budget; it can be cut at any time. Points are a promise of a
          future airdrop with no stated value. We show all three separately and never fold points
          into an APY figure, because nobody can honestly price them.
        </p>
      </Section>

      <Section title="A measured zero is not a missing number">
        <p>
          Several venues accept tokenized stocks as collateral but never lend them out. Those
          rows show <strong className="text-fg">0%</strong> because zero is the correct answer.
          Rows where we simply have not collected a rate say{" "}
          <strong className="text-fg">not collected</strong> instead. These are different things
          and the table never blurs them.
        </p>
      </Section>

      <Section title="What we refuse to publish">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Marketing ceilings. &ldquo;Up to 4%&rdquo; is not a rate and does not go in the table.</li>
          <li>Estimated or back-filled APYs. If we did not read it from a source, it is null.</li>
          <li>
            A rate without a timestamp. Every row shows when it was last collected, and rows
            older than twice the refresh interval are flagged as stale.
          </li>
        </ul>
      </Section>

      <Section title="Known gaps">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            We do not publish liquidation thresholds as a column, only the maximum
            loan-to-value. Aave reports a 5.5% liquidation bonus on its equity reserves; other
            venues express the same risk differently, and a single column would flatten
            distinctions that matter.
          </li>
          <li>
            Crypto.com publishes a per-stock rate table but does not say whether the yield is
            interest, an incentive or revenue share. We record the total and leave the split
            null, and those rows are excluded from the &ldquo;yield that is real
            interest&rdquo; figure rather than counted as incentives.
          </li>
          <li>
            Bybit and Bitrue both list tokenized stocks for spot trading but pay nothing on
            them. They stay on the watchlist so the absence is documented rather than implied.
          </li>
          <li>
            Kraken&rsquo;s xStocks Vault rates are still uncollected: they need an on-chain
            reader for the Veda vault share price on Ink.
          </li>
          <li>
            CeFi has no usable public API for tokenized stock earn products. Kraken&rsquo;s vault
            rates need an on-chain reader we have not built yet; Bitrue and Crypto.com need
            manual checks.
          </li>
          <li>
            DefiLlama reports no reward APY for the Kamino xStocks markets even though incentive
            programmes have been announced there, so our reward column may understate them.
          </li>
          <li>
            TVL on CeFi venues is almost never disclosed. Those cells read &ldquo;Not
            disclosed&rdquo; rather than being left blank.
          </li>
          <li>
            {seed.watchlist.length} venues sit on the{" "}
            <Link href="/#table" className="underline">
              watchlist
            </Link>{" "}
            because we could not confirm a live rate.
          </li>
        </ul>
      </Section>

      <Section title="Use the data">
        <p>
          The full dataset is available as JSON at{" "}
          <a href="/api/opportunities" className="underline">
            /api/opportunities
          </a>{" "}
          and as CSV at{" "}
          <a href="/api/opportunities.csv" className="underline">
            /api/opportunities.csv
          </a>
          . It is free to use. A link back is appreciated but not required.
        </p>
      </Section>

      <Section title="Corrections">
        <p>
          If a number here is wrong, it is worth telling us — the fix usually takes one line in a
          seed file. Every opportunity carries a <code className="rounded bg-bg-subtle px-1">verified</code>{" "}
          flag that only a human can set.
        </p>
      </Section>

      <p className="mt-8 rounded-lg border bg-bg-subtle p-4 text-sm leading-relaxed text-fg-muted">
        {DISCLAIMER}
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}
