/**
 * Every brand string lives here. Changing the product name is a one-file edit.
 */
export const BRAND_NAME = "StockAPY";
export const BRAND_TAGLINE = "Where tokenized stocks actually earn";
export const SITE_URL = "https://stockapy.xyz";
export const SITE_DESCRIPTION =
  "An independent comparison of every place you can earn yield on tokenized stocks — " +
  "across chains, issuers, DeFi protocols and CeFi platforms. Base rates, incentives and " +
  "points shown separately, with a source and a timestamp on every number.";

/** Shown in the footer and on the methodology page. */
export const DISCLAIMER =
  "Information only, not financial advice. Numbers are collected automatically and can be " +
  "wrong or stale. Verify on the platform before depositing anything.";

/** How often the data jobs run. Keep in sync with .github/workflows/fetch.yml. */
export const REFRESH_INTERVAL_SECONDS = 3600;

/** Social profiles: footer links and Organization.sameAs in the JSON-LD. */
export const SOCIAL = {
  x: "https://x.com/tekr9d3r",
  github: "https://github.com/tekr9d3r/stockapy",
} as const;

/** The newsletter's promise, used in every signup form. */
export const NEWSLETTER = {
  name: `${BRAND_NAME} Weekly`,
  headline: "The best tokenized-stock yields, every week",
  promise:
    "Every week: the best pools and updated yields — what you can actually do with your " +
    "tokenized stocks right now. Free, one email, unsubscribe anytime.",
} as const;
