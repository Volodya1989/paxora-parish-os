export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

type SlidingWindowRateLimiterOptions = {
  maxAttempts: number;
  windowMs: number;
  now?: () => number;
};

export class SlidingWindowRateLimiter {
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly attempts = new Map<string, number[]>();

  constructor(options: SlidingWindowRateLimiterOptions) {
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
  }

  consume(key: string): RateLimitDecision {
    const now = this.now();
    const windowStart = now - this.windowMs;
    const existing = this.attempts.get(key) ?? [];
    const pruned = existing.filter((timestamp) => timestamp > windowStart);

    if (pruned.length >= this.maxAttempts) {
      const oldest = pruned[0] ?? now;
      const retryAfterMs = Math.max(oldest + this.windowMs - now, 0);
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      this.attempts.set(key, pruned);
      return {
        allowed: false,
        retryAfterSeconds,
        remaining: 0
      };
    }

    pruned.push(now);
    this.attempts.set(key, pruned);

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(this.maxAttempts - pruned.length, 0)
    };
  }

  reset(key: string) {
    this.attempts.delete(key);
  }

  clear() {
    this.attempts.clear();
  }
}
