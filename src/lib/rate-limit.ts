/**
 * A small fixed-window limiter kept in memory. On Vercel each server instance
 * has its own memory, so this is best-effort: it stops a single script hammering
 * one instance, not a distributed attack. The robust layer is a Vercel Firewall
 * rate-limit rule on the same path.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** Records one attempt for `key`; false once the key is over its limit for this window. */
  allow(key: string, now = Date.now()): boolean {
    const e = this.hits.get(key);
    if (!e || now >= e.resetAt) {
      if (this.hits.size >= this.maxKeys) this.prune(now);
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    e.count++;
    return e.count <= this.limit;
  }

  private prune(now: number) {
    for (const [k, e] of this.hits) if (now >= e.resetAt) this.hits.delete(k);
    // Still full of live keys: drop the oldest rather than grow without bound.
    while (this.hits.size >= this.maxKeys) this.hits.delete(this.hits.keys().next().value!);
  }
}
