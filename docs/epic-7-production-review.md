# Epic 7 Production Review

## Issues Table

| Severity | File/Path | Issue | Why It Matters | Minimal Fix |
|----------|-----------|-------|----------------|-------------|
| **critical** | `app/api/cron/*/route.ts` (all 5) | Cron routes have zero authentication. Middleware matcher excludes `/api` paths; no `CRON_SECRET` header check. | Any external caller can trigger mass email sends (`weekly-digest`), push notifications (`event-reminders`, `request-reminders`), and data mutations (`archive-completed-tasks`, `archive-completed-requests`). | Add a shared `verifyCronSecret(req)` helper that checks `Authorization: Bearer $CRON_SECRET`. Return 401 if missing. Add `CRON_SECRET` to env. |
| **medium** | `server/actions/tasks.ts:350-360` | `getTaskDetail` extracts `parishId` from session but never passes it to query. Query checks membership in task's own parish, not active parish. | User belonging to multiple parishes can view task details across parishes regardless of active-parish context, breaking the isolation contract. | Pass `parishId` to `getTaskDetailQuery` and filter `where: { id: taskId, parishId }`. |
| **medium** | `server/auth/permissions.ts` vs `server/auth/parish.ts` | `permissions.ts` throws plain `Error("Unauthorized")`; `parish.ts` throws `ParishAuthError` with status codes. API routes rely on string-matching error messages to map HTTP statuses. | Fragile; a typo in an error message silently changes the HTTP status returned. | Adopt `ParishAuthError` in `permissions.ts` or use a shared error class. |
| **low** | `docs/pilot-runbook.md` | Missing `DATABASE_URL` in env checklist. | Prisma won't connect without it; pilot setup will fail on first step. | Add `DATABASE_URL` under a "Database" section. |
| **low** | `admin/reliability/page.tsx:88` | Timestamps rendered as raw ISO strings (`toISOString()`). | Hard for operators to triage quickly during incidents. | Use `toLocaleString()` or a date formatter. |

## Top 3 Fixes To Do Now

- **Authenticate cron routes** with a `CRON_SECRET` bearer token check. This is the only critical security gap.
- **Add `DATABASE_URL` to runbook** env checklist so first-time pilot deploys don't stall.
- **Pass `parishId` to `getTaskDetail` query** to enforce active-parish scoping on task reads.

## Safe To Defer

- Unify error classes (`ParishAuthError` vs plain `Error`) across auth modules.
- Format reliability page timestamps for operator readability.
- Add rate-limiting to cron routes after authentication is in place.

## Patch Snippets (Critical/High Only)

### Cron auth helper — new file `lib/cron/auth.ts`

```ts
import { NextResponse } from "next/server";

export function verifyCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const header = request.headers.get("authorization");
  if (header !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null; // OK
}
```

### Apply to each cron route (example: `app/api/cron/weekly-digest/route.ts`)

```diff
+import { verifyCronSecret } from "@/lib/cron/auth";

-export async function GET() {
+export async function GET(request: Request) {
+  const authError = verifyCronSecret(request);
+  if (authError) return authError;
+
   const now = getNow();
```

Repeat the same 3-line guard for all 5 cron routes.
