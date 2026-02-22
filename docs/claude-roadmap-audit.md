SUMMARY STATUS
- Fully Implemented: [4, 5]
- Partially Implemented: [6, 8]
- Not Implemented: [10]
- Needs Refactor / Fix: [3, 7, 9]

ITEM-BY-ITEM ANALYSIS

Item 3 – Close remaining audit blockers (R4, R7)
Status: Needs Fix

Evidence:
- Files involved: `server/actions/tasks.ts`, `domain/tasks/index.ts`, `server/actions/groups.ts`
- Components involved: none (server/domain)
- APIs involved: server action `rolloverTasksForWeek`
- DB schema impact: none found for missing R4/R7 fixes
- UI impact: hidden risk; unauthorized rollover can affect serve data integrity

Gap Identified:
- `rolloverTasksForWeek` validates session/parish but does not enforce leader/coordinator permission before rollover.
- `rolloverOpenTasks` has no actor-based authorization guard.
- Group creation transaction does not create/verify chat channel atomically (R4 still open).

Claude Action Required:
- Add explicit permission guard (leader/coordinator) to rollover flow before calling domain rollover; pass actor context if needed. Add atomic group+chat provisioning (or transactional guarantee + repair path) in group creation, with regression tests for both R4 and R7.

Item 4 – Add error tracking (Sentry)
Status: Fully

Evidence:
- Files involved: `instrumentation.ts`, `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `app/global-error.tsx`, `.env.example`, `next.config.mjs`
- Components involved: global error boundary
- APIs involved: `Sentry.init`, `Sentry.captureException`
- DB schema impact: none
- UI impact: no direct UX change; production error visibility enabled via DSN envs

Gap Identified:
- No implementation blocker found.

Claude Action Required:
- No code action required; keep DSN/release envs configured in deployment.

Item 5 – Normalize notification read/unread consistency
Status: Fully

Evidence:
- Files involved: `lib/queries/notifications.ts`, `lib/notifications/notify.ts`, `prisma/schema.prisma`, `prisma/migrations/20270815090000_notification_chat_membership_hardening/migration.sql`, `tests/notifications.test.ts`
- Components involved: notifications bell/feed consumers
- APIs involved: `getNotificationItems`, `getNotificationUnreadCount`, notification write helpers
- DB schema impact: stored notifications with `chatChannelId` + FK/indexes support membership-safe filtering
- UI impact: badge count aligns with visible feed under stored-notification path

Gap Identified:
- No material gap found for the stated consistency issue.

Claude Action Required:
- No action required.

Item 6 – Polish onboarding flow copy and sequencing
Status: Partial

Evidence:
- Files involved: `app/[locale]/(auth)/post-login/page.tsx`, `app/[locale]/(gate)/access/page.tsx`, `components/access/AccessGateContent.tsx`
- Components involved: access gate and post-login redirect
- APIs involved: `getAccessGateState`, `requestEmailVerification`, `joinParishByCodeAction`
- DB schema impact: none
- UI impact: sequence exists, but copy/locale polish incomplete

Gap Identified:
- Access screen copy remains mostly hardcoded English.
- Sequencing is functional but lacks stronger next-step cues for each status state in localized content.

Claude Action Required:
- Move access/onboarding copy to i18n keys and tighten status-specific CTA text (unverified/pending/none) so next action is explicit across locales.

Item 7 – Finish i18n sweep (hardcoded English -> t())
Status: Needs Fix

Evidence:
- Files involved: `components/groups/GroupCreateDialog.tsx`, `components/calendar/EventForm.tsx`, `components/tasks/TaskCreateDialog.tsx`, `components/groups/GroupsView.tsx`, `components/calendar/EventDeleteForm.tsx`
- Components involved: group/task/event creation and delete UX
- APIs involved: none
- DB schema impact: none
- UI impact: mixed-language experience persists (especially modal/delete and weekday labels)

Gap Identified:
- `GroupCreateDialog` and `TaskCreateDialog` are largely localized, but other high-traffic adjacent flows still contain hardcoded English.
- `EventForm` weekday labels are hardcoded (`Mon`…`Sun`).
- Group/event delete confirmations include hardcoded English strings.

Claude Action Required:
- Complete i18n sweep for remaining hardcoded strings in event/group destructive and form-adjacent flows; update locale files and parity tests.

Item 8 – Add confirmation modals for destructive actions
Status: Partial

Evidence:
- Files involved: `components/groups/GroupsView.tsx`, `components/calendar/EventDeleteForm.tsx`, `components/groups/members/GroupMembersView.tsx`
- Components involved: group delete, event delete, member removal dialogs
- APIs involved: `deleteGroup`, `deleteEvent`, member removal actions
- DB schema impact: none
- UI impact: confirmation UX exists for key destructive paths

Gap Identified:
- Confirmation dialogs are present for core group/event/member flows, but copy quality/localization is inconsistent.
- Coverage of all destructive surfaces is not uniformly centralized/patterned.

Claude Action Required:
- Standardize confirmation modal pattern and i18n copy across destructive actions; verify no one-click destructive bypass remains in secondary screens.

Item 9 – Clarify Serve vs Tasks navigation
Status: Needs Fix

Evidence:
- Files involved: `lib/navigation/routes.ts`, `components/navigation/navItems.ts`, `messages/en.json`, `messages/uk.json`, `components/tasks/TasksView.tsx`
- Components involved: primary nav and tasks surface
- APIs involved: none
- DB schema impact: none
- UI impact: ambiguity remains because nav label is still generic “Serve” while separate serve-board surface exists

Gap Identified:
- Primary nav still uses `nav.serve` label (“Serve” / “Служіння”) without explicit distinction from serve board.
- Serve board remains a separate route and is linked contextually, but naming hierarchy is still unclear.

Claude Action Required:
- Rename nav and route-facing copy to clearly distinguish personal task surface vs leader board (e.g., “My Tasks” vs “Serve Board”), and add explicit cross-surface helper text.

Item 10 – Add basic product analytics (PostHog or similar)
Status: Not

Evidence:
- Files involved: no `lib/analytics.ts` found; no analytics client/provider integration found in app/layout paths
- Components involved: none
- APIs involved: none
- DB schema impact: none
- UI impact: no product usage instrumentation visible

Gap Identified:
- No analytics library integration present.
- No event capture abstraction or app-wide provider/bootstrapping.
- No environment flags for analytics configuration in `.env.example`.

Claude Action Required:
- Add minimal analytics layer (provider + `track()` wrapper + key events), wire into app shell, and gate by env/config for safe rollout.

⚠️ Assumption Mismatch
- Item 5 appears implemented and regression-tested.
- Item 9 does not appear fully implemented; current nav/copy still leaves Serve vs Serve Board ambiguity.

Claude Execution Order (Optimized)
1. Critical (blocking): 3, 10
2. Security-related: 3
3. UX-impacting: 9, 7, 6, 8
4. Minor cleanup: none
