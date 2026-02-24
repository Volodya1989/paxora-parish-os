# Greetings → Automation Page Migration Plan

## 1. Executive Summary

This document details the migration of all parish greeting controls from the current split locations (Profile page for parishioner consent + admin template settings) into a dedicated **Automation** page accessible under the "More" menu on mobile and in the desktop sidebar. The migration preserves existing behavior, hardens timezone-aware scheduling, and creates a foundation for future automation features.

**Key changes:**
- New `/admin/automation` route with role-gated access (ADMIN/SHEPHERD for config; MEMBER for personal consent)
- High-frequency cron (every 15 minutes UTC) with per-parish local-time window gating — replacing the current exact-minute match that silently misses sends if the cron fires even one minute off
- Schema additions: `Parish.greetingsEnabled` (global on/off toggle) and defensive defaults for missing timezone
- Parishioner consent toggle remains in Profile (users expect to find personal preferences there) with a cross-link from the Automation page
- Backward compatibility via existing `isMissingColumnError` fallback pattern during incremental migration

---

## 2. Current-State Findings

### 2.1 User/Admin Entry Points

| Entry point | Location | Who sees it | Purpose |
|---|---|---|---|
| `ProfileDates` component | `/profile` page (`#important-dates`) | All users | Birthday/anniversary month+day input, greetings opt-in toggle, gentle onboarding prompt |
| `ParishGreetingSettings` component | `/profile` page (admin-only conditional) | ADMIN/SHEPHERD | Birthday/anniversary HTML templates, send-time picker (quarter-hour), parish logo upload |
| `updateProfileDates` action | `app/actions/profile.ts` | All users | Saves birthday/anniversary dates to `User` table |
| `updateAllowParishGreetings` action | `app/actions/profile.ts` | All users | Toggles `Membership.allowParishGreetings` (with fallback to `User.greetingsOptIn`) |
| `markGreetingsPromptNotNow` / `DoNotAskAgain` | `app/actions/profile.ts` | All users | Controls gentle prompt suppression |
| `updateParishGreetingTemplates` action | `app/actions/parishGreetings.ts` | ADMIN/SHEPHERD | Saves templates + send-time to `Parish` table |

### 2.2 Consent Read/Write Logic

Consent uses a **membership-first, user-fallback** pattern:

1. **Write path** (`updateAllowParishGreetings`): Tries `Membership.allowParishGreetings` first. On `P2022` (missing column during partial migration), falls back to `User.greetingsOptIn`.
2. **Read path** (`getCurrentUserProfile`): Fetches both `User` and `Membership` greetings fields; returns `membership.allowParishGreetings ?? user.greetingsOptIn`.
3. **Cron read path** (`route.ts`): Filters memberships with `allowParishGreetings: true`. On `P2022`, falls back to `user.greetingsOptIn: true`.

**Why:** The `Membership`-scoped consent allows per-parish opt-in (a user in multiple parishes can opt in to one but not another). The `User`-level fields are the legacy fallback for databases that haven't completed the `20270824090000` migration.

### 2.3 Cron Scheduling Logic

**File:** `app/api/cron/greetings/route.ts`

1. Authenticated via `CRON_SECRET` Bearer token (timing-safe compare in `lib/cron/auth.ts`).
2. Fetches all active parishes with their timezone + send-time config.
3. For each parish, converts `now` (UTC) → parish-local date parts via `Intl.DateTimeFormat`.
4. Calls `shouldRunGreetingForParishTime()` — **exact minute match**: `nowHour === sendHourLocal && nowMinute === sendMinuteLocal`.
5. Queries memberships with matching birthday/anniversary for today's local date.
6. Calls `sendGreetingEmailIfEligible()` per member per greeting type.

**Current cron frequency:** Not found in `vercel.json` (likely configured in Vercel dashboard). The exact-minute match in `shouldRunGreetingForParishTime` means the cron **must** fire at the exact configured minute for each parish. If configured to run every 15 minutes, it only works for parishes configured on 15-minute boundaries. If configured to run hourly, it only works for `:00` parishes.

### 2.4 Idempotency & Failure Modes

| Mechanism | Implementation | Effectiveness |
|---|---|---|
| `GreetingEmailLog` unique index | `(userId, parishId, type, dateKey)` | Prevents duplicate sends same day — robust |
| `P2002` duplicate detection | `isGreetingEmailDuplicateError()` in `greetings.ts` | Returns `SKIPPED` on conflict — correct |
| Email send failure | `emailService.ts` logs to `EmailLog` with `FAILED` status + `DeliveryAttempt` | Observed, but no automatic retry — greeting is lost for the day |
| Missing sender config | Returns `FAILED` with error logged | Silent failure — admin not notified |
| Auth header missing/wrong | Returns 401 immediately | Correct |
| Parish with no/invalid timezone | Falls back to `"UTC"` via `parish.timezone || "UTC"` | Works but sends at UTC time, not local |

**Key gap:** If the cron fires at minute `:14` and a parish is configured for `:15`, the greeting is skipped entirely with no retry.

---

## 3. Proposed Target Architecture

### 3.1 Route Structure

```
/admin/automation          — Automation page (main)
/admin/automation#greetings — Greeting configuration section anchor
```

**Access control:**
- **ADMIN/SHEPHERD:** Full access — toggle greetings on/off, set send time, manage templates, upload logo
- **MEMBER:** No access (redirect to `/profile`) — personal consent stays on profile page

### 3.2 Mobile Nav Placement

Add "Automation" to the More drawer for ADMIN/SHEPHERD roles, between "Reports" and "People":

```typescript
// In navItems.ts getMoreNavItems():
{ labelKey: "nav.automation", href: routes.adminAutomation, icon: "AU", testId: "automation" }
```

```typescript
// In routes.ts:
adminAutomation: "/admin/automation"
```

### 3.3 Component Decomposition

```
app/[locale]/(app)/admin/automation/page.tsx  (server component)
├── components/automation/GreetingsSection.tsx  (client)
│   ├── GreetingsToggle            — Parish-level enable/disable
│   ├── SendTimeSelector           — Quarter-hour local time picker (reuse buildQuarterHourTimeOptions)
│   └── ParishTimezoneDisplay      — Read-only display of parish timezone
├── components/automation/GreetingTemplatesCard.tsx  (client, extracted from ParishGreetingSettings)
│   ├── Birthday template textarea
│   ├── Anniversary template textarea
│   └── AvatarUploadField (parish logo)
└── components/automation/GreetingsConsentInfo.tsx  (server)
    └── Link to /profile#important-dates with explanation
```

**Reuse strategy:**
- Extract template editing logic from `ParishGreetingSettings.tsx` into `GreetingTemplatesCard.tsx`
- `ParishGreetingSettings.tsx` becomes a thin wrapper or is deprecated
- `ProfileDates.tsx` remains in `/profile` — personal consent belongs there
- `buildQuarterHourTimeOptions()` and `parseGreetingLocalTime()` reused as-is

### 3.4 Data Flow

```
┌──────────────────┐     ┌──────────────────────────────┐
│ Automation page   │────▷│ updateParishGreetingConfig()  │ (new server action)
│ (admin only)      │     │ - greetingsEnabled toggle     │
│                   │     │ - sendHourLocal/sendMinuteLocal│
│                   │     │ - templates + sanitization    │
│                   │     │ - logo (existing endpoint)     │
└──────────────────┘     └──────────────────────────────┘

┌──────────────────┐     ┌──────────────────────────────┐
│ Profile page      │────▷│ updateAllowParishGreetings()  │ (existing)
│ (all users)       │     │ - per-member consent toggle   │
└──────────────────┘     └──────────────────────────────┘
```

### 3.5 Backward Compatibility During Migration

1. **Phase 1:** Add new route + components. Keep `ParishGreetingSettings` on profile page rendering simultaneously.
2. **Phase 2:** Once Automation page is stable, remove `ParishGreetingSettings` from profile page. Add redirect link.
3. **All `isMissingColumnError` fallbacks remain** until the `greetingsEnabled` migration is confirmed rolled out to all environments.

---

## 4. Scheduling Correctness (Critical)

### 4.1 Current Problem

`shouldRunGreetingForParishTime()` performs an **exact minute match**:

```typescript
return input.nowHour === input.sendHourLocal && input.nowMinute === input.sendMinuteLocal;
```

This fails when:
- The cron fires at `:14` instead of `:15` (platform jitter)
- The cron is configured at intervals that don't align with all parish send times
- DST transitions shift the local time by 1 hour, but the cron ran before the shift

### 4.2 Recommended Solution: 15-Minute Window Match

**Replace exact match with window-based gating:**

```typescript
// lib/email/greetingSchedule.ts
export function shouldRunGreetingForParishTime(input: {
  nowHour: number;
  nowMinute: number;
  sendHourLocal: number;
  sendMinuteLocal: number;
}) {
  const nowTotalMinutes = input.nowHour * 60 + input.nowMinute;
  const sendTotalMinutes = input.sendHourLocal * 60 + input.sendMinuteLocal;

  const diff = nowTotalMinutes - sendTotalMinutes;

  // Match if current time is within [sendTime, sendTime + 14 minutes]
  // This ensures a 15-min cron always catches the window exactly once
  return diff >= 0 && diff < 15;
}
```

**Why this works:**
- A cron running every 15 minutes will hit each 15-minute window exactly once
- Idempotency via `GreetingEmailLog` unique index prevents double sends even if the cron runs twice in the window
- Handles platform jitter (cron fires 1-2 minutes late)

**Cron configuration:** Ensure the cron runs at `*/15 * * * *` (every 15 minutes UTC). This is the recommended Vercel Cron schedule.

### 4.3 DST Handling

`Intl.DateTimeFormat` already handles DST correctly — it converts UTC time to the current local time for the timezone, including DST offsets. The window-based approach means that during the DST "spring forward" (when 2:00 AM becomes 3:00 AM), a parish configured for 2:30 will skip that day (the local time 2:30 never exists). This is acceptable and matches user expectations.

During "fall back" (when 2:00 AM happens twice), the `GreetingEmailLog` idempotency prevents duplicate sends.

### 4.4 Invalid/Missing Timezone

Current code: `parish.timezone || "UTC"` — this is correct as a fallback but should be logged as a warning.

**Proposed addition:**

```typescript
if (!parish.timezone) {
  console.warn(`Parish ${parish.id} has no timezone configured, defaulting to UTC`);
}

// Validate timezone before use
try {
  Intl.DateTimeFormat("en-US", { timeZone: parish.timezone || "UTC" });
} catch {
  console.error(`Parish ${parish.id} has invalid timezone: ${parish.timezone}`);
  // Skip this parish or use UTC
  continue;
}
```

### 4.5 Schema Additions for Automation Config

```prisma
model Parish {
  // ... existing fields ...
  greetingsEnabled           Boolean @default(true)
  greetingsSendHourLocal     Int     @default(9)    // already exists
  greetingsSendMinuteLocal   Int     @default(0)    // already exists
}
```

The cron will check `greetingsEnabled` before processing any memberships for a parish:

```typescript
if (!parish.greetingsEnabled) continue;
```

---

## 5. Implementation Steps

### Step 1: Schema Migration

**New migration file:** `prisma/migrations/YYYYMMDD_automation_greetings_enabled/migration.sql`

```sql
ALTER TABLE "Parish"
  ADD COLUMN "greetingsEnabled" BOOLEAN NOT NULL DEFAULT true;
```

**Update `schema.prisma`:** Add `greetingsEnabled Boolean @default(true)` to Parish model.

**Estimated risk:** Low — additive column with default, no downtime.

### Step 2: Route + Nav Wiring

1. Add `adminAutomation: "/admin/automation"` to `lib/navigation/routes.ts`.
2. Add `nav.automation` to `messages/en.json` (and `messages/uk.json` if applicable).
3. Insert Automation nav item in `getMoreNavItems()` for ADMIN/SHEPHERD roles in `components/navigation/navItems.ts`.
4. Create `app/[locale]/(app)/admin/automation/page.tsx` — server component with role guard.

### Step 3: Automation Page Components

1. **Extract** `GreetingTemplatesCard` from `ParishGreetingSettings.tsx`.
2. **Create** `GreetingsSection` with:
   - Enable/disable toggle (reads/writes `Parish.greetingsEnabled`)
   - Send-time selector (reuses existing quarter-hour picker)
   - Parish timezone display (read-only)
3. **Create** `GreetingsConsentInfo` — informational card linking to `/profile#important-dates`.
4. **Create** new server action `updateParishGreetingConfig()` in `app/actions/parishGreetings.ts` that handles the `greetingsEnabled` toggle in addition to existing template/time updates.

### Step 4: Cron Logic Updates

1. **Update** `shouldRunGreetingForParishTime()` to use 15-minute window matching.
2. **Add** `greetingsEnabled` check in the cron loop (`if (!parish.greetingsEnabled) continue;`).
3. **Add** timezone validation with logging.
4. **Update** the parish query to include `greetingsEnabled` field (with `isMissingColumnError` fallback defaulting to `true`).
5. **Update existing tests** in `tests/unit/greeting-schedule.test.ts` to reflect window-based matching.

### Step 5: Remove Admin Greeting Settings from Profile

1. Remove the `ParishGreetingSettings` rendering from `app/[locale]/(app)/profile/page.tsx`.
2. Add an informational link card: "Manage greeting templates in [Automation](/admin/automation)" for ADMIN/SHEPHERD.
3. Keep `ProfileDates` (personal consent) on Profile page unchanged.

### Step 6: Observability

1. Add structured logging to cron: `{ parishId, timezone, localTime, action: "SEND"|"SKIP_WINDOW"|"SKIP_DISABLED"|"SKIP_NO_MATCHES" }`.
2. Log parish timezone warnings for missing/invalid timezones.
3. Emit counters: `greetings.sent`, `greetings.skipped`, `greetings.failed`, `greetings.parishes_processed`.

### Step 7: Rollout Plan

1. **Deploy migration** (Step 1) first — zero-downtime additive column.
2. **Deploy Automation page + cron changes** behind no feature flag (the `isMissingColumnError` fallback pattern provides safe rollback).
3. **After 1 week** of stable operation, deploy Step 5 (remove admin settings from Profile).
4. **After full migration confirmed**, optionally remove `User.greetingsOptIn` legacy fallback paths (not urgent).

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cron doesn't fire every 15 min (platform config drift) | Medium | Missed greetings | Document required Vercel Cron config; add monitoring alert if cron hasn't run in 20 min |
| DST spring-forward skips a greeting | Low | 1 greeting delayed 24h | Acceptable behavior; document in admin UI tooltip |
| `greetingsEnabled` column missing during rollout | Expected | Cron crash | `isMissingColumnError` fallback defaults to `true` (same pattern used elsewhere) |
| Admin sets invalid send time | Low | No sends | `parseGreetingLocalTime` already validates; UI only offers valid quarter-hour options |
| Template XSS via custom HTML | Low | Email content injection | `sanitizeGreetingHtml` already strips dangerous tags; no change needed |
| Email send failure with no retry | Medium | Lost greeting | Existing behavior; out of scope for this migration (recommend separate retry queue RFC) |
| Profile page loses admin greeting controls before Automation is ready | Low | Admin confusion | Phased rollout: keep both visible in Phase 1, remove from Profile in Phase 2 |
| Multiple parishes for same user, different timezones | Low | User gets greeting at unexpected time | Already handled — greeting is per-parish, sent at parish's local time |

---

## 7. Test Matrix

### 7.1 Unit Tests

| Test | File | What it validates |
|---|---|---|
| Window-based time matching | `tests/unit/greeting-schedule.test.ts` | `shouldRunGreetingForParishTime` returns true within 0-14 min window, false outside |
| Window boundary: exactly at send time | same | `nowMinute === sendMinute` → true |
| Window boundary: 14 min after | same | `now = sendTime + 14` → true |
| Window boundary: 15 min after | same | `now = sendTime + 15` → false |
| Midnight wraparound | same | `sendTime=23:45, now=00:05` → false (next day, idempotency covers it) |
| `parseGreetingLocalTime` validation | same (existing) | Rejects invalid times, non-15-min boundaries |
| `buildQuarterHourTimeOptions` | same (existing) | 96 options, correct values |
| `greetingsEnabled=false` skips parish | `tests/unit/cron-greetings.test.ts` (new) | Parish with `greetingsEnabled: false` produces 0 sends |
| Template sanitization | `tests/unit/sanitize.test.ts` | `sanitizeGreetingHtml` strips script tags, preserves allowed tags |
| Greeting prompt cooldown | existing tests | `shouldShowGreetingsPrompt` 60-day cooldown logic |

### 7.2 API/Action Auth Tests

| Test | What it validates |
|---|---|
| `updateParishGreetingConfig` rejects MEMBER role | Returns "Forbidden" |
| `updateParishGreetingConfig` allows ADMIN | Saves successfully |
| `updateParishGreetingConfig` allows SHEPHERD | Saves successfully |
| `updateParishGreetingConfig` rejects unauthenticated | Returns "Unauthorized" |
| `updateAllowParishGreetings` works for any authenticated user | Existing behavior preserved |
| Cron rejects missing `CRON_SECRET` | Returns 401 |
| Cron rejects wrong `CRON_SECRET` | Returns 401 (timing-safe) |

### 7.3 Cron Integration Tests

| Test | What it validates |
|---|---|
| Send at configured time | Parish at 09:00, cron fires at 09:02 → sends greeting |
| Skip outside window | Parish at 09:00, cron fires at 09:20 → skips |
| Idempotency on double-fire | Cron fires twice in same window → second run returns SKIPPED |
| Multiple timezones | Parish A (America/New_York, 09:00), Parish B (Europe/Kyiv, 09:00) → correct sends at different UTC times |
| `greetingsEnabled=false` | Parish with toggle off → no queries for memberships |
| Invalid timezone | Parish with `timezone: "Fake/Zone"` → logged, skipped |
| Missing timezone | Parish with `timezone: null` → defaults to UTC, logged |
| Fallback when `greetingsSendHourLocal` column missing | Uses default 09:00 |
| Fallback when `allowParishGreetings` column missing | Uses `user.greetingsOptIn` |
| Both birthday and anniversary same day | Sends both greetings, 2 GreetingEmailLog entries |

### 7.4 Regression Tests for Partially Migrated DBs

| Test | What it validates |
|---|---|
| DB without `greetingsSendHourLocal` column | Cron defaults to 09:00 for all parishes |
| DB without `allowParishGreetings` column | Cron falls back to `User.greetingsOptIn` |
| DB without `greetingsEnabled` column | Cron defaults to `true` (enabled) |
| Action writes `greetingsEnabled` with missing column | Falls back gracefully, returns `sendTimeSupported: false` |

### 7.5 UI Tests (Playwright/Cypress)

| Test | What it validates |
|---|---|
| Automation page visible in More menu for ADMIN | Nav item present, page loads |
| Automation page visible in More menu for SHEPHERD | Nav item present, page loads |
| Automation page NOT visible for MEMBER | Nav item absent, direct URL redirects |
| Greetings toggle persists state | Toggle on → refresh → still on |
| Send time selector saves | Select 10:30 → save → refresh → shows 10:30 |
| Template edit + save round-trip | Edit birthday template → save → refresh → template preserved |
| Profile page still shows consent toggle | All users see "Allow parish greetings" switch |
| Profile page no longer shows admin template settings | ADMIN on profile → no template textareas |
| Profile → Automation link works for admin | Click link → navigates to automation page |

### 7.6 Manual QA Checklist (3 Timezones)

**Timezones to test:**
1. `America/New_York` (UTC-5 / UTC-4 DST)
2. `Europe/Kyiv` (UTC+2 / UTC+3 DST)
3. `Pacific/Auckland` (UTC+12 / UTC+13 DST — date-ahead of UTC)

**For each timezone:**
- [ ] Create parish with timezone set
- [ ] Set send time to a near-future 15-minute boundary
- [ ] Add member with today's birthday, `allowParishGreetings: true`
- [ ] Trigger cron endpoint manually with `CRON_SECRET`
- [ ] Verify email received
- [ ] Trigger cron again → verify no duplicate
- [ ] Set `greetingsEnabled: false` → trigger cron → verify no email
- [ ] Check `GreetingEmailLog` entries in database

---

## 8. Open Questions Requiring Product Decision

1. **Should the Automation page be the future home for other automation features** (e.g., automated weekly digest, event reminders, follow-up emails)? If yes, the page should be designed as a tabbed or sectioned layout from the start.

2. **Should MEMBER users see a read-only view of the Automation page** (e.g., "Your parish sends birthday greetings at 9:00 AM") or should it be fully hidden from non-admin users?

3. **Should we add a "Send test greeting" button** on the Automation page for admins to preview the email with their current template?

4. **Email retry for failed greetings:** Currently, a failed email send is logged but never retried. Should we add a retry queue as part of this migration, or defer to a separate RFC?

5. **Granular enable/disable:** Should `greetingsEnabled` be a single toggle, or should admins be able to enable birthday greetings but disable anniversary greetings independently?

6. **Profile page consent removal timeline:** How long should we keep the `ParishGreetingSettings` on the Profile page after the Automation page is available? 1 sprint? 2 sprints?

7. **Localization of send-time display:** Should the send-time picker show 12-hour format (AM/PM) for `en` locale and 24-hour for `uk` locale, or always 24-hour?
