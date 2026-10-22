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
          Aave V4 and Morpho come from their own GraphQL APIs, which cover markets DefiLlama
          does not index, and Kraken&rsquo;s vaults are read directly from Ink, Kraken&rsquo;s
          own L2. Anything no API covers is entered by hand and labelled as such, and rows
          sourced by hand carry the date a human last checked them. A single row can draw on
          more than one source: Kraken&rsquo;s vaults take their size from the chain and their
          rate from a human reading Kraken&rsquo;s page, because no one source has both.
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
          These are resolved from each protocol&rsquo;s own identifiers, not guessed: Kamino
          market and reserve addresses and Jupiter vault ids from their APIs, Morpho market ids cross-checked
          against the markets listed in their sitemap, and Aave reserves by symbol. Where two
          markets shared a collateral, loan asset and LLTV, we used on-chain activity to tell
          them apart rather than picking one.
        </p>
        <p>
          Crypto.com and Kraken have no public per-market URL, so those rows link to the
          product page. Every other market links to its own vault, reserve or market page.
        </p>
        <p>
          The timestamp in the last column links to that pool&rsquo;s rate and TVL history on
          DefiLlama, where we read it from. That link is always exact, because the pool id is
          the one we query.
        </p>
      </Section>

      <section id="liquidity" className="scroll-mt-20">
        <Section title="Liquidity pools">
          <p>
            We cover three venues, where nearly all tokenized-stock liquidity sits: Raydium on Solana,
            Uniswap on Base, BNB Chain, Ethereum and Robinhood Chain, and Aero on Base and Robinhood
            Chain. Only <strong className="text-fg">active</strong> pools are listed: at least $1,000
            traded in the last 24 hours and at least $10k in the pool. Below that a pool is not
            meaningfully traded and its fee rate is noise.
          </p>
          <p>
            <strong className="text-fg">Raydium</strong> data comes from Raydium&rsquo;s own API. Each
            pool&rsquo;s configuration gives Raydium&rsquo;s cut of trading fees — currently 12% to the
            protocol and 4% to a fund — and Raydium&rsquo;s published fee APR is computed on the full fee.
            We apply the cut, so our figure is what an LP actually keeps, about 16% below Raydium&rsquo;s.
          </p>
          <p>
            <strong className="text-fg">Uniswap</strong> pools come from GeckoTerminal, CoinGecko&rsquo;s
            on-chain DEX index, which gives each pool&rsquo;s address, 24h volume, value and fee tier.
            Uniswap&rsquo;s own documented data route is its subgraphs on The Graph, which need an API
            key. The fee APY is 24h volume × fee tier ÷ value, before any Uniswap protocol fee, which
            applies to some pools and is not deducted.
          </p>
          <p>
            <strong className="text-fg">Aero</strong>, launched on 21 October 2026 from the merger of
            Aerodrome and Velodrome, publishes no pool data API. We read its pools on-chain from
            Aero&rsquo;s LP Sugar contract, the same contract the Aero app reads, on Base and Robinhood
            Chain. It returns each pool&rsquo;s reserves, the swap volume and fees over the last 24 hours,
            its fee settings and its gauge emissions; prices come from DefiLlama, with GeckoTerminal as
            a fallback, and a pool we cannot price is not listed. We apply Aero&rsquo;s own arithmetic
            for value, volume and fees, then compute the fee APY the same way as for the other venues:
            a year of fees, less the 5% Aero sends to sAERO Token Operators, divided by the pool&rsquo;s
            whole value. Aero&rsquo;s app divides by the liquidity near the current price only, so it
            shows a higher figure. An Aero LP takes either those fees or the AERO emissions paid to the
            pool&rsquo;s gauge, never both, so we show emissions as dollars per day beside the fee APY,
            with no total. While a pool has less than a day of on-chain history, its figures cover the
            hours available, are flagged, and are left out of the headline median. Pools left over from
            Aerodrome and Velodrome before the merger are not Aero pools and are not listed.
          </p>
          <p>
            A pool is listed only if one of its tokens is in our registry of tokenized-stock contracts,
            matched by <strong className="text-fg">address</strong>. Every address in the registry was
            checked against the token&rsquo;s own on-chain name, because symbols are free to copy:
            building it turned up a Solana token called AMDC whose on-chain name is a USD stablecoin.
            Every row links to the exact pool&rsquo;s deposit page and to its independent page on
            GeckoTerminal. All rates are before impermanent loss.
          </p>
        </Section>
      </section>

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

      <Section title="Programmes that have ended">
        <p>
          Incentive programmes stop. When one does, we mark the opportunity{" "}
          <strong className="text-fg">Ended</strong> rather than deleting it: the row keeps
          the last rate we recorded, shown struck through, with the date and what we
          observed. Ended rows are excluded from every headline figure — the median, the
          best rate, the totals and the borrow tables — so a programme that no longer pays
          cannot flatter the numbers.
        </p>
        <p>
          We keep them because a venue that paid for a while and then stopped is the most
          direct evidence this site has for its own argument. A yield aggregator that
          quietly removes the rows loses that history.
        </p>
      </Section>

      <Section title="Listed and unlisted markets">
        <p>
          Anyone can create a Morpho Blue market, and Morpho only surfaces curated ones in
          its own interface. Several of the largest tokenized-stock markets are{" "}
          <strong className="text-fg">not</strong> listed there: one NVDA market holds about
          $1.4m of collateral and pays a 39% borrow rate, and you will not find it by
          browsing. It is reachable by direct link and the collateral is real, so we list
          it — flagged <strong className="text-fg">Unlisted</strong>, because an uncurated
          market&rsquo;s oracle and parameters have had nobody&rsquo;s eyes on them.
        </p>
        <p>
          Where several markets exist for the same stock and loan asset, we show each as its
          own row rather than picking one. They are genuinely different markets with
          different rates, sizes and risk.
        </p>
      </Section>

      <Section title="Lend rate is not the stock&rsquo;s rate">
        <p>
          Morpho lists a &ldquo;Lend Rate&rdquo; against markets whose collateral is a
          tokenized stock, and on some of them it is very high — over 50% on one Robinhood
          Chain market as we write. It is easy to read that as yield on the stock. It is not.
          Morpho&rsquo;s documentation is explicit that{" "}
          <a href="https://docs.morpho.org/learn/concepts/market/" target="_blank" rel="noopener" className="underline">
            lenders deposit the loan asset
          </a>{" "}
          and that collateral is posted by borrowers and never lent out, so that rate belongs
          to whoever supplies the USDG or USDC.
        </p>
        <p>
          We show it in the borrow table as &ldquo;Lend side&rdquo;, clearly separated from
          what the stock earns, which on Morpho is zero. Folding it into the stock&rsquo;s APY
          would make this site exactly as misleading as the pages it is meant to clarify.
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
            Superform&rsquo;s own app and DefiLlama disagree on its vault rates by roughly a
            factor of 1.8 — on 19 Oct 2026 Superform showed 12.56% on superTSLA where
            DefiLlama reported 22.98%, with both reporting the same deposits. The rate is sUP
            emissions in both cases, so the gap is how that token is valued and annualised.
            We publish DefiLlama&rsquo;s figure because it is the source we can read hourly,
            which means our highest headline rate is the higher of two readings. Check the
            vault page before trusting it.
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
            Kraken&rsquo;s vault sizes are read from the Veda BoringVault contracts on Ink,
            valued at the vault&rsquo;s share supply times the price of the underlying xStock.
            The exact share rate lives in an Accountant contract whose address we could not
            find, so this understates each vault by roughly the yield it has accrued since
            launch — on the order of a percent. The rates themselves are hand-entered from
            Kraken&rsquo;s site, because their Earn API needs an authenticated key.
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
