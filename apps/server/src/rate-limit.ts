/**
 * Sliding-window rate limiter (in-memory). Keyed by bucket+identity. Used for
 * room creation, join/restore attempts, and per-session gameplay bursts (SEC-002,
 * SEC-007, REALTIME_PROTOCOL rate limits).
 */
export interface RateRule {
  limit: number;
  windowMs: number;
}

export const RATE_RULES = {
  create: { limit: 5, windowMs: 10 * 60 * 1000 },
  join: { limit: 20, windowMs: 5 * 60 * 1000 },
  restore: { limit: 30, windowMs: 5 * 60 * 1000 },
  intent: { limit: 20, windowMs: 1000 },
} as const satisfies Record<string, RateRule>;

export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(private now: () => number = Date.now) {}

  /** Returns true if the action is allowed (and records it), false if limited. */
  check(bucket: keyof typeof RATE_RULES, identity: string): boolean {
    const rule = RATE_RULES[bucket];
    const key = `${bucket}:${identity}`;
    const t = this.now();
    const cutoff = t - rule.windowMs;
    const arr = (this.hits.get(key) ?? []).filter((ts) => ts > cutoff);
    if (arr.length >= rule.limit) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(t);
    this.hits.set(key, arr);
    return true;
  }

  /** Drop stale entries to bound memory. */
  sweep(): void {
    const t = this.now();
    for (const [key, arr] of this.hits) {
      const bucket = key.split(":")[0] as keyof typeof RATE_RULES;
      const windowMs = RATE_RULES[bucket]?.windowMs ?? 60_000;
      const kept = arr.filter((ts) => ts > t - windowMs);
      if (kept.length === 0) this.hits.delete(key);
      else this.hits.set(key, kept);
    }
  }
}
