import { SlidingWindowRateLimiter, type RateLimitDecision } from "@/lib/security/rateLimit";

const LOGOUT_ALL_WINDOW_MS = 10 * 60 * 1000;
const LOGOUT_ALL_MAX_ATTEMPTS = 5;

const logoutAllLimiter = new SlidingWindowRateLimiter({
  maxAttempts: LOGOUT_ALL_MAX_ATTEMPTS,
  windowMs: LOGOUT_ALL_WINDOW_MS
});

function resolveClientAddress(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function consumeLogoutAllDevicesRateLimit(input: {
  userId: string;
  request: Request;
}): RateLimitDecision {
  const clientIp = resolveClientAddress(input.request.headers);
  return logoutAllLimiter.consume(`logout-all:${input.userId}:${clientIp}`);
}

export function resolveRequestClientAddress(request: Request): string {
  return resolveClientAddress(request.headers);
}

export function resetAuthSessionRateLimitersForTest() {
  logoutAllLimiter.clear();
}
