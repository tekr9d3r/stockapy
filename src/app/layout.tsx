import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND_NAME, BRAND_TAGLINE, DISCLAIMER, SITE_DESCRIPTION, SITE_URL } from "@/config";
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

const NAV = [
  { href: "/", label: "Earn" },
  { href: "/borrow", label: "Borrow" },
  { href: "/hub", label: "Hub" },
  { href: "/platforms", label: "Platforms" },
  { href: "/issuers", label: "Issuers" },
  { href: "/methodology", label: "Methodology" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} flex min-h-screen flex-col`}>
        <header className="sticky top-0 z-20 border-b bg-bg/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
            <Link href="/" className="font-semibold tracking-tight">
              {BRAND_NAME}
            </Link>
            <nav className="flex flex-1 items-center gap-4 overflow-x-auto text-sm text-fg-muted">
              {NAV.slice(1).map((item) => (
                <Link key={item.href} href={item.href} className="whitespace-nowrap hover:text-fg">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>

        <footer className="mt-12 border-t bg-bg-subtle">
          <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-fg-muted">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-fg">
                  {item.label}
                </Link>
              ))}
              <Link href="/glossary" className="hover:text-fg">
                Glossary
              </Link>
              <a href="/api/opportunities" className="hover:text-fg">
                Open data
              </a>
            </div>
            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-fg-subtle">{DISCLAIMER}</p>
            <p className="mt-2 text-xs text-fg-subtle">
              © {new Date().getFullYear()} {BRAND_NAME}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
