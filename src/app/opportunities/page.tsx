import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { OpportunityTable } from "@/components/OpportunityTable";
import { getRows } from "@/lib/data/rows";
import { loadLatestSnapshot } from "@/lib/data/snapshot";
import { formatDate } from "@/lib/format";
import { breadcrumbLd, datasetLd, itemListLd } from "@/lib/seo/jsonld";
import { BRAND_NAME } from "@/config";

export const revalidate = 3600;

const DESCRIPTION =
  "Every tokenized stock yield opportunity in one sortable table, with base interest and " +
  "token incentives shown separately. Filter by stock, chain, venue type and category.";

export const metadata: Metadata = {
  title: "All markets",
  description: DESCRIPTION,
  alternates: { canonical: "/opportunities" },
};

export default function OpportunitiesPage() {
  const rows = getRows();
  const asOf = formatDate(loadLatestSnapshot()?.fetchedAt ?? null);

  return (
    <>
      <JsonLd
        data={[
          datasetLd({
            name: "All tokenized stock yield markets",
            description: DESCRIPTION,
            url: "/opportunities",
            modified: loadLatestSnapshot()?.fetchedAt ?? null,
            variables: ["APY", "Base APY", "Reward APY", "TVL in USD", "Lockup", "Chain"],
          }),
          itemListLd(rows, "All tokenized stock yield markets"),
          breadcrumbLd([
            { name: BRAND_NAME, path: "/" },
            { name: "All markets", path: "/opportunities" },
          ]),
        ]}
      />

      <h1 className="text-3xl font-semibold tracking-tight">All markets</h1>
      <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-fg-muted">
        Every one of the {rows.length} markets we track, flat and sortable. For a view grouped
        by platform, see{" "}
        <Link href="/earn" className="text-accent underline underline-offset-2">
          Earn
        </Link>
        .
      </p>
      <p className="mt-1 text-xs text-fg-subtle">Last run {asOf}</p>

      <div className="mt-6">
        <OpportunityTable rows={rows} />
      </div>
    </>
  );
}
