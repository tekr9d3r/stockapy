import fs from "node:fs";

const cache = new Map<string, { mtimeMs: number; value: unknown }>();

/**
 * Parsed JSON, re-read only when the file changes. Data files change once an
 * hour, but dynamic routes (the API, Markdown mirrors) read them per request;
 * without this, a flood of requests with varied query strings would re-parse
 * them every time. Returns null when the file is missing or unreadable.
 */
export function readJsonCached<T>(file: string): T | null {
  try {
    const { mtimeMs } = fs.statSync(file);
    const hit = cache.get(file);
    if (hit && hit.mtimeMs === mtimeMs) return hit.value as T;
    const value = JSON.parse(fs.readFileSync(file, "utf8")) as T;
    cache.set(file, { mtimeMs, value });
    return value;
  } catch {
    return null;
  }
}
