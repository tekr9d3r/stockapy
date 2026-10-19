/**
 * Downloads a logo for every underlying asset in the seed and commits it to
 * public/logos/. We self-host rather than hotlink: a third-party CDN that
 * disappears would break every row, and hotlinking leaks visitor IPs.
 *
 *   npx tsx scripts/fetch-logos.ts            only fetch what is missing
 *   npx tsx scripts/fetch-logos.ts --force    re-fetch everything
 *
 * Logos are company trademarks, used here to identify the company being
 * compared. See public/logos/README.md.
 */
import fs from "node:fs";
import path from "node:path";
import { loadSeed } from "../src/lib/data/seed";

const OUT_DIR = path.join(process.cwd(), "public", "logos");
const MANIFEST = path.join(process.cwd(), "data", "logos.json");
const PLATFORM_DIR = path.join(OUT_DIR, "platforms");
const PLATFORM_MANIFEST = path.join(process.cwd(), "data", "platform-logos.json");

/**
 * Platform marks. No ticker CDN covers protocols, so these come from each
 * platform's own favicon. Google's service normalises them all to 128px, which
 * DuckDuckGo's does not.
 */
const faviconUrl = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

/** The domain to read each platform's mark from, keyed by seed platform id. */
const PLATFORM_DOMAINS: Record<string, string> = {
  kamino: "kamino.finance",
  "jupiter-lend": "jup.ag",
  superform: "superform.xyz",
  morpho: "morpho.org",
  aave: "aave.com",
  euler: "euler.finance",
  loopscale: "loopscale.com",
  kraken: "kraken.com",
  bitrue: "bitrue.com",
  cryptocom: "crypto.com",
  bybit: "bybit.com",
};

/** Tried in order. SVG first: it is smaller and stays sharp at any size. */
const SOURCES = [
  { name: "parqet", ext: "svg", url: (t: string) => `https://assets.parqet.com/logos/symbol/${t}` },
  {
    name: "fmp",
    ext: "png",
    url: (t: string) => `https://financialmodelingprep.com/image-stock/${t}.png`,
  },
];

/** An SVG from a third party is untrusted input, even though <img> will not run it. */
const UNSAFE_SVG = /<script|\son\w+\s*=|<foreignObject|javascript:|xlink:href\s*=\s*["']https?:/i;

async function tryFetch(ticker: string) {
  for (const source of SOURCES) {
    try {
      const res = await fetch(source.url(ticker), { redirect: "follow" });
      if (!res.ok) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength < 200) continue;

      if (source.ext === "svg") {
        const text = buffer.toString("utf8");
        if (!text.includes("<svg")) continue;
        if (UNSAFE_SVG.test(text)) {
          console.warn(`  ${ticker}: ${source.name} SVG contains active content, skipping`);
          continue;
        }
      }

      return { buffer, ext: source.ext, source: source.name };
    } catch (err) {
      console.warn(`  ${ticker}: ${source.name} failed (${err})`);
    }
  }
  return null;
}

async function fetchPlatformLogos(force: boolean) {
  fs.mkdirSync(PLATFORM_DIR, { recursive: true });
  const manifest: Record<string, string> = fs.existsSync(PLATFORM_MANIFEST)
    ? JSON.parse(fs.readFileSync(PLATFORM_MANIFEST, "utf8"))
    : {};

  console.log("\nPlatforms:");
  for (const platform of loadSeed().platforms) {
    const domain = PLATFORM_DOMAINS[platform.id];
    if (!domain) {
      console.warn(`  ${platform.id}: no domain mapped, will render a monogram`);
      continue;
    }
    const existing = manifest[platform.id];
    if (!force && existing && fs.existsSync(path.join(PLATFORM_DIR, existing))) {
      console.log(`  ${platform.id}: already have ${existing}`);
      continue;
    }

    try {
      const res = await fetch(faviconUrl(domain));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength < 200) throw new Error("suspiciously small");

      const fileName = `${platform.id}.png`;
      fs.writeFileSync(path.join(PLATFORM_DIR, fileName), buffer);
      manifest[platform.id] = fileName;
      console.log(`  ${platform.id}: ${fileName} (${buffer.byteLength} bytes, ${domain})`);
    } catch (err) {
      console.warn(`  ${platform.id}: FAILED (${err})`);
    }
  }

  fs.writeFileSync(PLATFORM_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${Object.keys(manifest).length} platform logos in the manifest`);
}

async function main() {
  const force = process.argv.includes("--force");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest: Record<string, string> = fs.existsSync(MANIFEST)
    ? JSON.parse(fs.readFileSync(MANIFEST, "utf8"))
    : {};

  const missing: string[] = [];

  for (const asset of loadSeed().underlying_assets) {
    const existing = manifest[asset.ticker];
    if (!force && existing && fs.existsSync(path.join(OUT_DIR, existing))) {
      console.log(`${asset.ticker}: already have ${existing}`);
      continue;
    }

    const result = await tryFetch(asset.ticker);
    if (!result) {
      console.warn(`${asset.ticker}: NO LOGO FOUND — the UI will fall back to a monogram`);
      missing.push(asset.ticker);
      delete manifest[asset.ticker];
      continue;
    }

    const fileName = `${asset.ticker.toLowerCase()}.${result.ext}`;
    fs.writeFileSync(path.join(OUT_DIR, fileName), result.buffer);
    manifest[asset.ticker] = fileName;
    console.log(
      `${asset.ticker}: ${fileName} from ${result.source} (${result.buffer.byteLength} bytes)`,
    );
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `\n${Object.keys(manifest).length} stock logos in the manifest` +
      (missing.length ? `, ${missing.length} missing: ${missing.join(", ")}` : ""),
  );

  await fetchPlatformLogos(force);
}

main();
