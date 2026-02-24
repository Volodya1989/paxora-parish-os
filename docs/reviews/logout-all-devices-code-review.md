# Code Review: "Log Out of All Devices" — Session Revocation

**Date:** 2026-02-24
**Reviewer:** Claude (automated code review)
**Scope:** `authSessionVersion` mechanism, `/api/security/logout-all`, JWT/session callbacks, UI, tests

---

## Overall Assessment

**Verdict: The core design is sound but has one critical gap and several material weaknesses.**

The version-counter approach (`authSessionVersion`) for JWT revocation is a well-known pattern
and correctly chosen for a stateless JWT stack. The implementation covers the right surface area:
API endpoint, JWT callback version check, session callback invalidation, rate limiting, audit
logging, confirmation UX, and tests.

However, the "keep current session" mechanism (`authSessionKeepJti`) **does not exist in the
codebase**. The current implementation relies on `trigger === "update"` as the sole mechanism to
preserve the initiating session, which is both fragile and exploitable. Any other session in any
tab can also call `update()` and un-revoke itself.

---

## Critical Findings

### C1. `trigger === "update"` Is an Unrestricted Revocation Bypass

**File:** `server/auth/options.ts:122-124`
**Severity:** Critical
**Impact:** Complete bypass of "logout all devices" — any revoked session can restore itself.
**Exploitability:** Trivial. Any client-side code (or browser tab) that calls
`useSession().update()` or `getSession()` with the right trigger will reset
`isSessionRevoked = false` and adopt the new `authSessionVersion`, effectively un-revoking itself.

```typescript
// Current code — lines 122-124
if (isSessionRefresh) {
  token.authSessionVersion = dbSessionVersion;
  token.isSessionRevoked = false;
}
```

**Concrete failure scenario:**

1. User A has sessions on Device 1 (laptop) and Device 2 (phone).
2. User A clicks "Log out all devices" on Device 1.
3. `authSessionVersion` increments from 0 → 1 in DB.
4. Device 1 calls `update()` → JWT callback sees `trigger === "update"` → token gets version 1
   and `isSessionRevoked = false`. Device 1 stays alive. **Correct.**
5. Device 2 does **anything** that triggers a session refresh — navigating to a page that calls
   `getSession()`, or any component calling `update()` — the JWT callback sees
   `trigger === "update"` → Device 2 also gets version 1 and `isSessionRevoked = false`.
   Device 2 is silently un-revoked. **Incorrect.**

**Root cause:** There is no mechanism to distinguish the initiating session from other sessions.
The `authSessionKeepJti` approach described in the task context would solve this but is **not
implemented** — no `jti` field is checked, no `getToken()` call exists in the route, no
`authSessionKeepJti` column exists in the schema.

**Fix:** Implement the keep-JTI mechanism:

```typescript
// In route.ts: read current token's JTI, store it
import { getToken } from "next-auth/jwt";

export async function POST(request: Request) {
  const token = await getToken({ req: request });
  if (!token?.jti) {
    return NextResponse.json({ error: "Token unavailable" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      authSessionVersion: { increment: 1 },
      authSessionKeepJti: token.jti
    }
  });
  // ...
}

// In JWT callback: only spare the session whose JTI matches
if (tokenSessionVersion < dbSessionVersion) {
  if (token.jti === dbUser.authSessionKeepJti) {
    token.authSessionVersion = dbSessionVersion;
    token.isSessionRevoked = false;
  } else {
    token.isSessionRevoked = true;
  }
}
```

This requires adding `authSessionKeepJti String?` to the User model.

---

## High Findings

### H1. DB Query on Every JWT Callback Invocation — Performance and Availability Risk

**File:** `server/auth/options.ts:100-109`
**Severity:** High
**Impact:** Every authenticated request triggers a `prisma.user.findUnique`. Under load, this
creates N database queries per page load (one per API call/RSC), with no caching.

The JWT callback in NextAuth fires on **every request** that reads the session (middleware,
`getServerSession`, `getToken`, `useSession` polling). With the current code, every one of these
hits the database.

**Concrete failure scenario:** A page with 5 server components each calling `getServerSession`
produces 5 DB queries just for session validation. Under 100 concurrent users, this is
500 queries/page-load burst to the User table.

**Fix options (pick one):**

1. **Short TTL cache:** Check version from DB only every ~60 seconds per token. Store
   `lastVersionCheckAt` in the token; skip DB lookup if within TTL. Revocation latency becomes
   bounded by TTL (acceptable for this feature).
2. **Redis-backed version cache:** Store `userId → authSessionVersion` in Redis with short TTL.
3. **Conditional check:** Only query DB when `trigger !== "signIn"` and enough time has elapsed.

### H2. In-Memory Rate Limiter Does Not Survive Restarts / Scale-Out

**File:** `lib/security/rateLimit.ts` — `SlidingWindowRateLimiter` uses an in-process `Map`.
**Severity:** High (multi-instance), Medium (single instance)
**Impact:** Rate limits reset on every deploy/restart. In a multi-instance setup (Vercel
serverless, multiple pods), each instance has its own counter.

**Fix:** Use Redis-backed rate limiter (e.g., `@upstash/ratelimit`) for production, or document
the single-instance limitation explicitly.

### H3. Middleware Does Not Enforce Revocation

**File:** `middleware.ts:44-45`
**Severity:** High
**Impact:** The middleware only checks `Boolean(token)` — it does not check `isSessionRevoked` or
`isDeleted`. A revoked JWT will still pass the middleware `authorized` check.

```typescript
// Current — line 45
authorized: ({ token, req }) => Boolean(token) || isPublicPath(req.nextUrl.pathname)
```

**Fix:**

```typescript
authorized: ({ token, req }) => {
  if (isPublicPath(req.nextUrl.pathname)) return true;
  return Boolean(token) && !token.isSessionRevoked && !token.isDeleted;
}
```

**Caveat:** This only works if `isSessionRevoked` is already baked into the JWT from a prior
callback run. For a freshly-revoked token that hasn't gone through the JWT callback yet,
middleware cannot detect it without a DB call. This is an inherent limitation of stateless JWTs.

---

## Medium Findings

### M1. Version Increment + Audit Log Are Not Atomic

**File:** `app/api/security/logout-all/route.ts:45-61`
**Severity:** Medium
**Impact:** If `auditLog` fails after the version increment, revocation happens but with no audit
trail.

**Fix:** Wrap in `prisma.$transaction`:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.user.update({
    where: { id: session.user.id },
    data: { authSessionVersion: { increment: 1 } }
  });
  await auditLog(tx, { /* ... */ });
});
```

### M2. Rate Limit Key Includes Client IP — Bypassable via IP Rotation

**File:** `lib/security/authSessionRateLimit.ts:33`
**Severity:** Medium
**Impact:** Key is `logout-all:${userId}:${clientIp}`. Attacker with multiple IPs can exceed the
per-user limit. Since the user is already authenticated, key on `userId` alone.

**Fix:** `logoutAllLimiter.consume(\`logout-all:${input.userId}\`)`

### M3. `x-forwarded-for` IP Extraction Is Spoofable

**File:** `lib/security/authSessionRateLimit.ts:12-16`
**Severity:** Medium
**Impact:** Without trusted reverse-proxy stripping the header, clients can inject arbitrary IPs.
Affects both rate limiting and audit log accuracy.

**Fix:** Document trusted-proxy assumption or use platform-native IP resolution.

### M4. Both Modal AND Drawer Render Simultaneously

**File:** `components/admin/people/PeopleView.tsx:383-421`
**Severity:** Medium (UX)
**Impact:** Both `<Modal>` and `<Drawer>` use `open={logoutConfirmOpen}`. Unless these components
handle responsive visibility internally, both render at once, causing accessibility issues.

**Fix:** Verify responsive exclusivity or add `useMediaQuery` guard.

### M5. `trigger === "update"` Fires for ALL `update()` Calls

**File:** `server/auth/options.ts:115,122-124`
**Severity:** Medium
**Impact:** Any feature that calls `session.update()` (switching parishes, profile updates) also
resets `isSessionRevoked`. Normal app flows can accidentally un-revoke sessions.

**Fix:** Resolved by C1 fix (keep-JTI approach).

---

## Low Findings

### L1. Response Body Leaks `keepCurrentSession: true`

**File:** `app/api/security/logout-all/route.ts:63`
**Impact:** Cosmetic metadata not used by client. Reveals implementation intent.
**Fix:** Return only `{ success: true }`.

### L2. Missing `activeParishId` Null Check

**File:** `app/api/security/logout-all/route.ts:15`
**Impact:** User without active parish cannot use this feature. Parish ID is only needed for
audit, not the core operation.
**Fix:** Make `activeParishId` optional; use sentinel for audit if null.

### L3. Audit `targetId` Same as `actorUserId`

**File:** `app/api/security/logout-all/route.ts:55`
**Impact:** Semantically correct but slightly confusing in log review.

### L4. Test Trigger Value Misleading

**File:** `tests/unit/auth-session-revocation.test.ts:53`
**Impact:** Uses `trigger: "signIn"` for stale-token test. Works by coincidence. Use `undefined`.

---

## What Is Already Good

1. **Version-counter pattern is correct.** `{ increment: 1 }` is atomic at the DB level.
2. **Role-based access control properly enforced.** Auth + authz checks before processing.
3. **Rate limiting present with correct sliding-window semantics.**
4. **Audit logging captures the right metadata** (IP, user agent, action, actor, target).
5. **Session callback correctly blanks user data on revocation** (`session.user.id = ""`).
6. **UI provides confirmation before destructive action** with loading state and toast feedback.
7. **Tests cover key scenarios** (401, 403, 429, 200, JWT revocation, session refresh).
8. **Migration is clean** — `NOT NULL DEFAULT 0`, backward-compatible.
9. **Error handling in UI** catches HTTP errors and network failures separately.

---

## Recommended Fix Plan (ordered)

| Priority | Finding | Effort | Action |
|----------|---------|--------|--------|
| **1** | C1 | Medium | Implement `authSessionKeepJti` — add schema field, store JTI in route, check JTI in JWT callback. Remove blind `trigger === "update"` bypass. |
| **2** | H3 | Low | Add `!token.isSessionRevoked && !token.isDeleted` to middleware `authorized` callback. |
| **3** | M1 | Low | Wrap version increment + audit log in `prisma.$transaction`. |
| **4** | H2 | Medium | Replace in-memory rate limiter with Redis-backed implementation or document limitation. |
| **5** | M2 | Low | Remove IP from rate-limit key; key on `userId` only. |
| **6** | H1 | Medium | Add TTL-based caching to JWT callback DB lookups. |
| **7** | M4 | Low | Verify Modal/Drawer responsive exclusivity or add `useMediaQuery` guard. |
| **8** | M3 | Low | Document trusted-proxy assumption or use platform-native IP. |
| **9** | L2 | Low | Make `activeParishId` optional for this endpoint. |

---

## Suggested Additional Tests

### Unit tests:

1. **Bypass via `trigger === "update"` on revoked session** — Assert current (broken) behavior;
   becomes regression test after C1 fix.
2. **JWT callback with deleted user** — Verify `isDeleted = true` and session blanking.
3. **JWT callback when user not found in DB** — `findUnique` returns null; verify graceful handling.
4. **Concurrent logout-all calls** — Two simultaneous POSTs increment independently.
5. **Rate limiter boundary** — Exactly `maxAttempts` succeed, `maxAttempts + 1` blocked,
   counter resets after window.
6. **Audit log failure after transaction fix** — Verify both operations roll back together.

### Integration tests:

7. **End-to-end revocation** — Two sessions, logout-all from one, verify other is revoked.
8. **Middleware redirect on revoked token** — After H3 fix, verify redirect to sign-in.
9. **Session polling detects revocation** — `useSession` refetch shows blank user ID.

### Edge-case tests:

10. **Integer overflow** — `authSessionVersion` near `2^31-1`; verify increment behavior.
11. **Endpoint without `activeParishId`** — Returns 401 for authenticated user without parish.
12. **UI double-click protection** — Rapid clicks don't fire multiple requests.
