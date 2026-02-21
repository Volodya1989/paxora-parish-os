import { test } from "node:test";
import assert from "node:assert/strict";
import { SlidingWindowRateLimiter } from "@/lib/security/rateLimit";

test("SlidingWindowRateLimiter enforces threshold inside window", () => {
  let now = 1_000;
  const limiter = new SlidingWindowRateLimiter({
    maxAttempts: 2,
    windowMs: 1_000,
    now: () => now
  });

  assert.equal(limiter.consume("k").allowed, true);
  assert.equal(limiter.consume("k").allowed, true);

  const blocked = limiter.consume("k");
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
});

test("SlidingWindowRateLimiter allows new attempts after window passes", () => {
  let now = 1_000;
  const limiter = new SlidingWindowRateLimiter({
    maxAttempts: 1,
    windowMs: 1_000,
    now: () => now
  });

  assert.equal(limiter.consume("k").allowed, true);
  assert.equal(limiter.consume("k").allowed, false);

  now += 1_001;
  const allowedAfterWindow = limiter.consume("k");
  assert.equal(allowedAfterWindow.allowed, true);
});

test("SlidingWindowRateLimiter reset clears key state", () => {
  const limiter = new SlidingWindowRateLimiter({ maxAttempts: 1, windowMs: 10_000 });

  assert.equal(limiter.consume("k").allowed, true);
  assert.equal(limiter.consume("k").allowed, false);

  limiter.reset("k");
  assert.equal(limiter.consume("k").allowed, true);
});
