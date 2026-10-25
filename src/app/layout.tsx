import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Menu } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { CategoryIcon } from "@/components/CategoryIcon";
import { NavLinks } from "@/components/NavLinks";
import { NewsletterBand } from "@/components/NewsletterBand";
import { PathGate } from "@/components/PathGate";
import { THEME_SCRIPT, ThemeToggle } from "@/components/ThemeToggle";
import { CATEGORIES, NAV_CATEGORIES } from "@/lib/categories";
import { BRAND_NAME, BRAND_TAGLINE, DISCLAIMER, SITE_DESCRIPTION, SITE_URL, SOCIAL } from "@/config";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const DATA_LINKS = [
  { href: "/stocks", label: "All stocks" },
  { href: "/opportunities", label: "All earn & borrow markets" },
  { href: "/platforms", label: "Platforms" },
  { href: "/issuers", label: "Issuers" },
  { href: "/methodology", label: "Methodology" },
  { href: "/glossary", label: "Glossary" },
  { href: "/developers", label: "API for agents" },
  { href: "/llms-full.txt", label: "Full data (Markdown)" },
  { href: "/api/opportunities.csv", label: "Open data (CSV)" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} flex min-h-screen flex-col`}>
        <header className="sticky top-0 z-30 border-b bg-bg/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
            <Link href="/" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
              <BrandMark />
              {BRAND_NAME}
            </Link>
            <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
              <NavLinks />
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/newsletter"
                className="hidden h-9 items-center rounded-md bg-accent px-3.5 text-sm font-semibold text-accent-fg hover:opacity-90 sm:inline-flex"
              >
                Get weekly picks
              </Link>
              <ThemeToggle />
              {/* Mobile menu: native <details>, so it works without JavaScript. */}
              <details className="group relative md:hidden">
                <summary className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-md border bg-bg-raised text-fg-muted [&::-webkit-details-marker]:hidden">
                  <Menu size={18} aria-hidden="true" />
                  <span className="sr-only">Menu</span>
                </summary>
                <nav aria-label="Main" className="absolute right-0 mt-2 flex w-60 flex-col gap-0.5 rounded-xl border bg-bg-raised p-2 shadow-card">
                  <NavLinks vertical />
                  <Link href="/newsletter" className="mt-1 rounded-md bg-accent px-3 py-2.5 text-center text-sm font-semibold text-accent-fg">
                    Get weekly picks
                  </Link>
                </nav>
              </details>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>

        <PathGate hideOn={["/newsletter"]}>
          <NewsletterBand />
        </PathGate>

        <footer className="mt-16 border-t bg-bg-subtle">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <BrandMark size={24} />
                {BRAND_NAME}
              </Link>
              <p className="mt-3 max-w-xs text-fg-muted">{BRAND_TAGLINE}. Independent, refreshed hourly, every number sourced.</p>
              <p className="mt-4 text-fg-muted">Built in Europe 🇪🇺</p>
            </div>
            <FooterCol title="Explore">
              {NAV_CATEGORIES.map((k) => (
                <Link key={k} href={CATEGORIES[k].href} className="flex items-center gap-2 text-fg-muted hover:text-fg">
                  <CategoryIcon category={k} size={14} />
                  {CATEGORIES[k].label}
                </Link>
              ))}
              <Link href="/newsletter" className="text-fg-muted hover:text-fg">Newsletter</Link>
            </FooterCol>
            <FooterCol title="Data">
              {DATA_LINKS.map((l) =>
                // API routes and data files are not pages: a plain link, no prefetch.
                l.href.startsWith("/api/") || l.href.includes(".") ? (
                  <a key={l.href} href={l.href} className="text-fg-muted hover:text-fg">{l.label}</a>
                ) : (
                  <Link key={l.href} href={l.href} className="text-fg-muted hover:text-fg">{l.label}</Link>
                ),
              )}
            </FooterCol>
            <FooterCol title="Follow">
              <a href={SOCIAL.x} target="_blank" rel="noopener me" className="flex items-center gap-2 text-fg-muted hover:text-fg">
                <XIcon /> X (Twitter)
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a href={SOCIAL.github} target="_blank" rel="noopener me" className="flex items-center gap-2 text-fg-muted hover:text-fg">
                <GitHubIcon /> GitHub — open source
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </FooterCol>
          </div>
          <div className="border-t">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl leading-relaxed">{DISCLAIMER}</p>
              <p className="flex shrink-0 gap-3">
                <span>© {new Date().getFullYear()} {BRAND_NAME}</span>
                <Link href="/privacy" className="hover:text-fg">Privacy</Link>
              </p>
            </div>
          </div>
        </footer>
        {/* Vercel Web Analytics: cookieless page-view counts, no personal data. */}
        <Analytics />
      </body>
    </html>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold tracking-wide text-fg uppercase">{title}</h2>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  );
}

/** Brand marks drawn inline; lucide does not ship third-party logos. */
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
