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
    `\n${Object.keys(manifest).length} logos in the manifest` +
      (missing.length ? `, ${missing.length} missing: ${missing.join(", ")}` : ""),
  );
}

main();
