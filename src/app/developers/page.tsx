import type { Metadata } from "next";
import { Bot, FileJson, FileText } from "lucide-react";
import { BRAND_NAME, SITE_URL } from "@/config";

export const metadata: Metadata = {
  title: "API and data for agents",
  description: `Free JSON API, Markdown pages and llms.txt for ${BRAND_NAME}'s tokenized-stock yield data. No key, CORS-open, CC BY 4.0.`,
  alternates: { canonical: "/developers" },
};

const ENDPOINTS = [
  { path: "/api/v1/summary", what: "Headline numbers and the best figure per stock" },
  { path: "/api/v1/earn?ticker=nvda&sort=apy&limit=5", what: "Deposit venues" },
  { path: "/api/v1/liquidity?ticker=nvda&min_tvl=250000&sort=fee", what: "Active DEX pools" },
  { path: "/api/v1/borrow?loan_asset=usdc&sort=cost", what: "Borrow markets" },
  { path: "/api/v1/stocks/nvda", what: "Everything for one stock" },
];

const MARKDOWN = ["/index.md", "/earn.md", "/liquidity.md", "/borrow.md", "/stock/nvda.md", "/llms.txt", "/llms-full.txt"];

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">API and data for agents</h1>
      <p className="mt-3 text-fg-muted">
        Free, no key, CORS-open, refreshed hourly. Licence CC BY 4.0: cite {BRAND_NAME} with a link.
      </p>

      <Block icon={<FileJson size={18} />} title="JSON API">
        <ul className="divide-y rounded-xl border bg-bg-raised">
          {ENDPOINTS.map((e) => (
            <li key={e.path} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <a href={e.path} className="font-mono text-[13px] text-accent hover:underline">{e.path}</a>
              <span className="text-sm text-fg-muted">{e.what}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-fg-muted">
          Spec: <a href="/openapi.json" className="font-mono text-accent hover:underline">/openapi.json</a>. Bad parameters return 400 with the allowed values.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border bg-bg-subtle p-3 text-[13px]">
          <code>curl &quot;{SITE_URL}/api/v1/liquidity?ticker=tsla&amp;limit=3&quot;</code>
        </pre>
      </Block>

      <Block icon={<FileText size={18} />} title="Markdown">
        <p className="mb-2 text-sm text-fg-muted">
          Add <code className="font-mono">.md</code> to a page, or request it with{" "}
          <code className="font-mono">Accept: text/markdown</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          {MARKDOWN.map((p) => (
            <a key={p} href={p} className="rounded-md border bg-bg-raised px-2.5 py-1 font-mono text-[13px] hover:border-border-strong">{p}</a>
          ))}
        </div>
      </Block>

      <Block icon={<Bot size={18} />} title="Citing">
        <p className="text-sm text-fg-muted">
          &ldquo;Source: {BRAND_NAME} ({SITE_URL}), retrieved [date].&rdquo; Every record has its own{" "}
          <code className="font-mono">fetchedAt</code> and <code className="font-mono">source</code>.
        </p>
      </Block>
    </div>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span aria-hidden="true" className="text-accent">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
