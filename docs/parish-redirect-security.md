# Secure Parish Redirect Approach

This document defines a safe way to redirect users to the correct parish context **without enabling cross-parish access**.

## Goals

- Always resolve the user’s destination parish from trusted server-side sources.
- Never trust client-provided `parishId` for authorization decisions.
- Fail closed when active parish context is missing or invalid.
- Keep redirect behavior consistent across auth callbacks, server actions, and route handlers.

## Threat model

Potential attacks this approach prevents:

1. **Forced cross-parish redirect** by tampering query params (e.g. `?parishId=other`).
2. **IDOR-style mutation after redirect** where user lands in parish UI they do not belong to.
3. **Stale context escalation** after membership changes (removed user still using old active parish).
4. **Session drift** between JWT/session claims and database truth.

## Source of truth hierarchy

Always resolve parish in this order (server-side):

1. `impersonatedParishId` (platform admin flow only)
2. `activeParishId` (stored on user record)
3. Fallback to first current membership parish (if active parish missing)
4. No valid parish -> redirect to access/setup flow

> Redirect resolution must happen on the server. The client may request a parish switch, but server must validate and persist it before redirecting.

## Redirect rules

### 1) Post-login redirect

- Read authenticated user from server session.
- Resolve effective parish via hierarchy above.
- If no valid parish membership exists:
  - redirect to `/access` (request/join flow) or setup path.
- If valid parish exists:
  - redirect to parish-scoped home (`/this-week`, `/parish`, etc.) under that active context.

### 2) Parish switch redirect

When user chooses a parish:

- Accept requested parish id as **intent only**.
- Validate `(userId, parishId)` membership in DB.
- If valid, update `User.activeParishId` server-side.
- Re-issue session/jwt context if needed.
- Redirect to normal destination.
- If invalid, return 403/404 and keep prior active parish.

### 3) Deep-link redirect with parish identifiers

For links containing a parish id:

- If link parish != active parish, server must verify user membership in target parish first.
- If verified, optionally switch active parish explicitly.
- If not verified, return not found/forbidden and do not reveal whether parish exists.

## Authorization boundary requirements

Redirect correctness is not sufficient by itself. Every mutating boundary must still enforce:

1. active parish exists
2. user is member of active parish
3. provided resource IDs belong to active parish

Use parish-scoped queries (`where: { id, parishId }`) or explicit ownership checks before update/delete.

## Recommended error policy

Use consistent outcomes:

- `401` unauthenticated / no active session
- `403` authenticated but not a member of active parish
- `404` cross-parish resource ID (avoid leaking existence)

## Minimal implementation pattern

1. Central helper: `requireActiveParishSession()` -> returns `{ userId, activeParishId }`.
2. Central helper: `requireParishMembershipInActiveParish(userId, activeParishId)`.
3. Resource guard helpers for high-risk models (`findFirst({ id, parishId })`).
4. Apply at start of all mutating actions/routes.
5. Add adversarial tests:
   - Parish A user mutates Parish B resource ID
   - missing active parish
   - active parish without membership

## Operational checks

Before pilot launch:

- Verify post-login always lands in an authorized parish context.
- Verify switching parish fails for non-membership targets.
- Verify direct URL tampering cannot access other parish data.
- Verify all mutating handlers reject cross-parish IDs.

## Do / Don’t

### Do

- Resolve redirect context server-side.
- Persist active parish only after membership validation.
- Re-check authz at every mutation boundary.

### Don’t

- Don’t trust `parishId` from query/body/cookie for authorization.
- Don’t use `findUnique({ id })` then mutate without parish scoping.
- Don’t treat redirects as a substitute for authorization.
