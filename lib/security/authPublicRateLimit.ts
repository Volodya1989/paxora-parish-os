import crypto from "node:crypto";
import { headers as getHeaders } from "next/headers";
import { normalizeEmail } from "@/lib/validation/auth";
import { SlidingWindowRateLimiter, type RateLimitDecision } from "@/lib/security/rateLimit";

const AUTH_SIGN_IN_WINDOW_MS = 10 * 60 * 1000;
const AUTH_SIGN_IN_MAX_ATTEMPTS = 10;

const AUTH_PASSWORD_RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const AUTH_PASSWORD_RESET_REQUEST_MAX_ATTEMPTS = 5;

const AUTH_PASSWORD_RESET_SUBMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_PASSWORD_RESET_SUBMIT_MAX_ATTEMPTS = 10;

const AUTH_EMAIL_VERIFY_WINDOW_MS = 15 * 60 * 1000;
const AUTH_EMAIL_VERIFY_MAX_ATTEMPTS = 10;

const signInLimiter = new SlidingWindowRateLimiter({
  maxAttempts: AUTH_SIGN_IN_MAX_ATTEMPTS,
  windowMs: AUTH_SIGN_IN_WINDOW_MS
});

const passwordResetRequestLimiter = new SlidingWindowRateLimiter({
  maxAttempts: AUTH_PASSWORD_RESET_REQUEST_MAX_ATTEMPTS,
  windowMs: AUTH_PASSWORD_RESET_REQUEST_WINDOW_MS
});

const passwordResetSubmitLimiter = new SlidingWindowRateLimiter({
  maxAttempts: AUTH_PASSWORD_RESET_SUBMIT_MAX_ATTEMPTS,
  windowMs: AUTH_PASSWORD_RESET_SUBMIT_WINDOW_MS
});

const emailVerifyLimiter = new SlidingWindowRateLimiter({
  maxAttempts: AUTH_EMAIL_VERIFY_MAX_ATTEMPTS,
  windowMs: AUTH_EMAIL_VERIFY_WINDOW_MS
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

function resolveRequestHeaders(request?: Request): Headers {
  if (request) {
    return request.headers;
  }

  return new Headers();
}

export async function resolveActionClientAddress(): Promise<string> {
  try {
    const requestHeaders = await getHeaders();
    return resolveClientAddress(requestHeaders);
  } catch {
    return "unknown";
  }
}

export function consumeSignInRateLimit(input: {
  email: string;
  request?: Request;
}): RateLimitDecision {
  const normalizedEmail = normalizeEmail(input.email);
  const client = resolveClientAddress(resolveRequestHeaders(input.request));
  return signInLimiter.consume(`signin:${client}:${normalizedEmail}`);
}

export function consumePasswordResetRequestRateLimit(input: {
  email: string;
  clientAddress: string;
}): RateLimitDecision {
  const normalizedEmail = normalizeEmail(input.email);
  return passwordResetRequestLimiter.consume(`reset-request:${input.clientAddress}:${normalizedEmail}`);
}

export function consumePasswordResetSubmitRateLimit(input: {
  token: string;
  clientAddress: string;
}): RateLimitDecision {
  const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex").slice(0, 16);
  return passwordResetSubmitLimiter.consume(`reset-submit:${input.clientAddress}:${tokenHash}`);
}

export function consumeVerifyEmailRateLimit(input: {
  token: string;
  clientAddress: string;
}): RateLimitDecision {
  const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex").slice(0, 16);
  return emailVerifyLimiter.consume(`verify-email:${input.clientAddress}:${tokenHash}`);
}

export const authPublicRateLimitConfig = {
  signIn: {
    maxAttempts: AUTH_SIGN_IN_MAX_ATTEMPTS,
    windowMs: AUTH_SIGN_IN_WINDOW_MS
  },
  passwordResetRequest: {
    maxAttempts: AUTH_PASSWORD_RESET_REQUEST_MAX_ATTEMPTS,
    windowMs: AUTH_PASSWORD_RESET_REQUEST_WINDOW_MS
  },
  passwordResetSubmit: {
    maxAttempts: AUTH_PASSWORD_RESET_SUBMIT_MAX_ATTEMPTS,
    windowMs: AUTH_PASSWORD_RESET_SUBMIT_WINDOW_MS
  },
  verifyEmail: {
    maxAttempts: AUTH_EMAIL_VERIFY_MAX_ATTEMPTS,
    windowMs: AUTH_EMAIL_VERIFY_WINDOW_MS
  }
};

export function resetAuthPublicRateLimitersForTest() {
  signInLimiter.clear();
  passwordResetRequestLimiter.clear();
  passwordResetSubmitLimiter.clear();
  emailVerifyLimiter.clear();
}
