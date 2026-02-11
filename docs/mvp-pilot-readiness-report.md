# 1) MVP Readiness Scorecard

Scope reviewed from current implementation (not roadmap docs):
- Routes/pages: `app/[locale]/(app)/*`, `app/[locale]/(auth)/*`, `app/[locale]/(gate)/*`, API routes under `app/api/*`.
- Core data model: `prisma/schema.prisma`.
- Server authority + write points: `server/actions/*`, `server/auth/*`.
- Query layer and role checks: `lib/queries/*`, `lib/permissions/index.ts`, `lib/requests/access.ts`.
- UX components: `components/*`.

| Area | Current Status (Implemented/Partial/Missing) | Risk | What’s missing | Effort |
|---|---|---|---|---|
| Auth/Onboarding | Partial | Med | Auth + gate are present, but first approved login is generic (always routed to `/this-week`), and there is no explicit role-specific onboarding checklist. | M |
| Roles/Permissions (parishioner/admin/clergy) | Partial | Med | Role guards exist, but consistency depends on per-action checks; needs authorization test sweep for all mutating endpoints. | M |
| Navigation/IA | Implemented | Low | Core nav works on desktop/mobile; continued IA simplification needed for admin-heavy areas. | S |
| Announcements | Implemented | Low | Draft/publish, rich text sanitize, and in-app/push notifications are present. | S |
| Events | Implemented | Low | Calendar, recurrence, RSVP, and event-request workflows exist. | S |
| Chat | Partial | Med | Replies/reactions/polls/attachments/read-state exist; no server-side message search and polling-based updates can become costly at scale. | M |
| Groups | Implemented | Low | Group CRUD, join policy, invites/membership states are present. | S |
| Serve/Tasks | Implemented | Low | Core weekly participation workflows exist; needs minor parishioner guidance polish. | S |
| Requests | Partial | High | End-to-end flow exists, but link consistency/role-context in notifications and board/detail pathways still needs hardening. | M |
| Notifications (bell + persistence) | Partial | High | Persistent notifications are implemented, but mixed fallback (`lastSeen*`) + stored `readAt` behavior still introduces edge-case inconsistency. | M |
| Volunteer hours visibility | Partial | Med | Hours are visible in profile and serve summary; not consistently surfaced at all weekly decision points. | S |
| Media uploads (chat/images) | Implemented | Med | Signed R2 upload path is implemented with type/size constraints; production setup and abuse handling process needed. | S |
| i18n (English/Ukrainian) | Partial | Med | Locale routing + persistence are good; several UI strings remain hardcoded English in pilot-critical flows. | M |
| Admin parish management | Implemented | Low | Platform parish CRUD + impersonation is present. | S |
| Accessibility | Partial | Med | Baseline semantics/focus styles exist; no formal accessibility audit/checklist evidence found. | M |
| Performance | Partial | Med | Indexing is generally solid; notification/chat polling and multi-query pages need pilot load verification. | M |
| Reliability/Logging | Partial | Med | Email logs + audit logs exist; no centralized observability/alerting stack found. | M |
| Analytics/Telemetry | Missing | High | No product analytics instrumentation found. | M |
| Content moderation/safety basics | Partial | High | Announcement HTML sanitization exists; no report/abuse moderation pipeline for chat/requests. | M |
| Data backup/migrations | Partial | Med | Prisma migrations are extensive and deployed in build flow; no backup/restore runbook found. | M |
| Mobile/PWA readiness | Partial | Med | Manifest/SW/install prompts/push toggles are implemented; pilot readiness depends on install + push eligibility workflow. | M |

Confirmed evidence paths used in assessment:
- Auth/gate: `app/[locale]/(auth)/sign-in/page.tsx`, `app/[locale]/(auth)/post-login/page.tsx`, `app/[locale]/(gate)/access/page.tsx`, `lib/auth/postLoginRedirect.ts`.
- Roles: `server/auth/permissions.ts`, `lib/permissions/index.ts`, `lib/requests/access.ts`.
- Navigation: `components/navigation/navItems.ts`, `components/navigation/Sidebar.tsx`, `components/navigation/MobileTabs.tsx`.
- Notifications: `components/notifications/*`, `lib/queries/notifications.ts`, `lib/notifications/notify.ts`, `app/api/notifications/*`.
- Chat: `app/[locale]/(app)/community/chat/page.tsx`, `components/chat/*`, `server/actions/chat.ts`, `lib/queries/chat.ts`, `app/api/chat/[channelId]/*`.
- Requests: `app/[locale]/(app)/requests/*`, `app/[locale]/(app)/admin/requests/page.tsx`, `server/actions/requests.ts`, `lib/queries/requests.ts`.
- i18n: `lib/i18n/*`, `messages/en.json`, `messages/uk.json`, `messages/es.json`, `components/i18n/LocalePersistence.tsx`.
- PWA/push: `app/manifest.ts`, `public/sw.js`, `components/pwa/*`, `components/push/*`, `lib/pwa/engagement.ts`, `lib/push/*`.
- Data model: `prisma/schema.prisma`, `prisma/migrations/*`.

---

# 2) “MVP Definition” (exact scope)

## In scope (MVP launch for 1–3 pilot parishes)
- Parishioners can sign in, pass access gate, and land on a weekly home.
- Admin/clergy can approve parish access and operate core parish weekly workflow.
- Announcements can be drafted/published and consumed reliably.
- Events can be created, browsed, and RSVP’d (including event request intake).
- Groups can be created/joined and used for participation coordination.
- Serve/tasks board supports assignment, volunteering, status transitions, and completion.
- Parishioners can submit requests and track their own request updates.
- Clergy/admin can triage requests with assignee/status/visibility controls.
- Chat supports day-to-day communication (channels, replies, reactions, image attachments).
- Notification center (bell) persists items with usable read/unread behavior.
- English and Ukrainian are both usable for weekly core journeys.

## Explicitly OUT of scope for MVP
- Record-keeping-heavy parish management systems beyond weekly rhythm.
- Advanced analytics warehouse/funnel dashboards.
- AI-powered moderation/semantic search.
- Enterprise SSO/SAML and deep third-party directory sync.
- Complex workflow automation engine.

---

# 3) Top Priorities (P0/P1/P2)

## P0 = must ship for pilot

### P0-1: Notification correctness for requests (recipient + deep link)
- **User problem:** Users receive notifications that can land in the wrong context.
- **Acceptance criteria:**
  - Requester gets requester-valid links.
  - Admin/shepherd gets board/detail links they can open.
  - No dead or unauthorized request links from bell.
- **Implementation notes:** Centralize request notification link builder and apply to both generated and persisted notifications.
- **Likely files/dirs impacted:** `lib/queries/notifications.ts`, `lib/notifications/notify.ts`, `lib/requests/access.ts`.
- **Short test plan:**
  - Manual: submit/assign/schedule/cancel request as member/admin/shepherd and click all generated notifications.
  - Automated: integration test asserting recipient-specific href and access.

### P0-2: Read-state consistency for bell notifications
- **User problem:** Users can lose track of unread items due to mixed fallback behavior.
- **Acceptance criteria:**
  - Per-item read only affects that item.
  - Category read only affects that category.
  - Mark-all is deterministic and persists after refresh.
- **Implementation notes:** Treat `Notification.readAt` as primary source; restrict `lastSeen*` use to explicit fallback migration logic.
- **Likely files/dirs impacted:** `app/api/notifications/mark-read/route.ts`, `lib/queries/notifications.ts`, `components/notifications/useNotifications.ts`.
- **Short test plan:**
  - Manual: read one/category/all and reload.
  - Automated: API-level tests for all mark-read payload variants.

### P0-3: Requests flow reliability (submit → triage → requester visibility)
- **User problem:** Requests are a trust-critical path for pilots.
- **Acceptance criteria:**
  - Created request appears in requester list immediately.
  - Role-appropriate staff board visibility is correct.
  - Status and assignment updates create visible feedback for requester/staff.
- **Implementation notes:** Add targeted regression tests around request creation, board query filtering, and notification write points.
- **Likely files/dirs impacted:** `server/actions/requests.ts`, `lib/queries/requests.ts`, `components/requests/*`, `tests/integration/*`.
- **Short test plan:**
  - Manual: complete lifecycle scenario.
  - Automated: integration test matrix for request status transitions.

### P0-4: i18n cleanup on pilot-critical screens
- **User problem:** Mixed language reduces clarity and trust for bilingual parishes.
- **Acceptance criteria:**
  - No hardcoded English in pilot-critical weekly flows.
  - Locale remains stable through route changes/reloads.
- **Implementation notes:** Replace literal strings with translator keys; extend message dictionaries.
- **Likely files/dirs impacted:** `app/[locale]/(app)/*`, `components/requests/*`, `components/chat/*`, `components/serve-board/*`, `messages/en.json`, `messages/uk.json`.
- **Short test plan:**
  - Manual EN/UK walkthrough.
  - Automated: key-presence/unit checks for affected namespaces.

### P0-5: Role-aware first-week onboarding guidance
- **User problem:** New users do not get immediate “what to do next” guidance.
- **Acceptance criteria:**
  - First approved login presents role-specific next actions.
  - Empty states always include a concrete CTA.
- **Implementation notes:** Use existing layout + card/empty-state components; avoid architecture changes.
- **Likely files/dirs impacted:** `app/[locale]/(auth)/post-login/page.tsx`, `components/this-week/*`, `components/app/list-empty-state.tsx`.
- **Short test plan:**
  - Manual first-login tests for member/admin/shepherd.

### P0-6: Parish isolation authorization sweep
- **User problem:** Any cross-parish visibility bug is a pilot blocker.
- **Acceptance criteria:**
  - All mutating routes/actions validate active parish + membership.
  - Foreign IDs return 403/404 consistently.
- **Implementation notes:** Add adversarial tests across actions and API routes.
- **Likely files/dirs impacted:** `app/api/**`, `server/actions/*`, `lib/queries/*`, `tests/integration/*`.
- **Short test plan:**
  - Manual + automated two-parish adversarial suite.

## P1 = ship soon after pilot start
- Chat search + deeper history pagination.
- Basic abuse reporting/moderation queue.
- Structured logging and alert hooks.
- Notification preference granularity by category.
- Better inline volunteer-hours reinforcement on Serve board.

## P2 = later
- Product analytics funnel instrumentation.
- Spanish rollout (once active locale support is intentionally enabled).
- Backup/restore runbook + restore drills.
- Additional IA simplification for advanced admin controls.

## GitHub-issue-ready tasks (18)
1. **[P0] Normalize request notification deep links by role context** — AC: all request notifications route to role-valid destination.
2. **[P0] Make persisted `Notification.readAt` the unread source of truth** — AC: unread counts remain stable after refresh/tab switch.
3. **[P0] Add integration tests for request notification recipients/hrefs** — AC: tests assert role recipient + path correctness.
4. **[P0] Add cross-parish authorization tests for request actions** — AC: out-of-parish IDs are rejected.
5. **[P0] Replace hardcoded request UI strings with i18n keys** — AC: EN/UK parity for requests flows.
6. **[P0] Add first-login role-aware “next steps” card** — AC: member/admin/shepherd each get distinct CTA list.
7. **[P0] Add mandatory CTA empty states to weekly core sections** — AC: no blank dead-end states.
8. **[P1] Add chat message search endpoint with access checks** — AC: searchable only within authorized channels.
9. **[P1] Add load-older pagination for chat history** — AC: user can fetch older batches on demand.
10. **[P1] Add report-abuse action for chat messages** — AC: leader queue receives report entry.
11. **[P1] Add report-abuse action for requests** — AC: flagged requests visible in admin filter.
12. **[P1] Implement structured server logger utility** — AC: critical actions emit structured error context.
13. **[P1] Build admin reliability panel (email/push failures)** — AC: recent failed sends are visible with retry guidance.
14. **[P1] Add category-level notification preference toggles** — AC: per-category subscription behavior is respected.
15. **[P1] Show volunteer milestone strip directly on Serve board** — AC: no duplicate backend logic used.
16. **[P2] Instrument key weekly rhythm analytics events** — AC: events documented + emitted at core touchpoints.
17. **[P2] Add controlled Spanish enablement path** — AC: locale can be enabled without routing refactor.
18. **[P2] Publish backup/restore runbook with drill checklist** — AC: documented and test-validated recovery steps.

---

# 4) UX / Product Gaps

## What is currently confusing or heavy
- **Onboarding clarity gap:** approved users are routed to the same destination regardless of role; no explicit first-week coaching.
- **Request context switching:** separate member/admin request surfaces require stronger context framing in notifications and detail screens.
- **Admin density:** request board combines multiple filters, dialogs, and actions in one area; workable but heavy for non-technical parish admins.
- **Localization inconsistency:** mixed hardcoded English + translated strings on weekly journeys.
- **Notification triage friction:** auto-clear behavior on panel-close can conflict with intentional triage behavior.
- **Mobile composer crowding in chat:** rich action surface is useful but visually dense on smaller screens.

## Concrete UI improvements aligned to current system
- Add a **role-aware quick-start card** to existing hero/page layout (reuse `ParishionerPageLayout`, `Card`, `Button`).
- Add **status timeline block** at top of request detail modal (reuse badge/metadata patterns already present).
- Standardize **empty-state CTA blocks** using current list/card empty-state components.
- Group admin filters into **Quick vs Advanced** using existing drawer components.
- Ensure all mutating actions show a **toast confirmation** using existing Toast provider.
- For mobile chat, move secondary actions into one compact action menu while preserving existing composer styling tokens.

---

# 5) Technical & Data Integrity Review

## Prisma model + migration safety
- Core entities and relations for pilot workflows are present (`Membership`, `Request`, `Notification`, `Chat*`, `Task`, `Event`, `Group`, `ParishHubItem`, etc.) in `prisma/schema.prisma`.
- Indexing is present on key read paths (notifications, requests, events, hours, chat messages).
- Build uses `prisma migrate deploy` (`package.json`), with large migration history under `prisma/migrations/*`.
- Gap: no explicit backup/restore operational runbook discovered.

## Permissions and multi-parish isolation
- Explicit role helpers are present in `lib/permissions/index.ts` and `server/auth/permissions.ts`.
- Many actions enforce active parish + membership checks before writes.
- Remaining risk is **consistency drift** because checks are distributed across many files rather than centralized policy middleware.

## Notification logic review (bell + persistence)
- Persistent notifications are created through `lib/notifications/notify.ts` and queried via `lib/queries/notifications.ts`.
- Read mutations are handled in `app/api/notifications/mark-read/route.ts`.
- Risk areas:
  - fallback generation logic vs stored notifications,
  - request-link correctness by role context,
  - broad room read updates when marking message category/all.

## Requests flow review (end-to-end)
- Submit path exists (`server/actions/requests.ts#createRequest` + request UI).
- Requester visibility exists (`listMyRequests`, member pages under `app/[locale]/(app)/requests/*`).
- Staff triage exists (`app/[locale]/(app)/admin/requests/page.tsx`, `listRequestsForBoard`, assign/status/visibility actions).
- In-app notification write points exist for request assignment/status updates.
- Highest-risk improvements: link routing consistency and regression tests for role visibility and recipient correctness.

## Chat review
- Access checks and channel visibility are enforced in query/action/API paths.
- Supports replies, polls, reactions, attachments, unread state, channel locking/pinning.
- Current update model is polling (`/api/chat/[channelId]/poll`) with cursor-based fetch.
- Gaps: no message search endpoint and potential scaling pressure from frequent polling.

## N+1 / endpoint risks observed
- No critical obvious N+1 hotspot in primary weekly workflows from inspected files.
- Some broad multi-query pages and repeated aggregate operations should be load-tested before scaling beyond pilot.
- Notification mark-read path can execute many upserts (one per channel) when marking all/messages.

---

# 6) “Pilot Launch Checklist”

## Config/env checklist
- Core:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
- Email:
  - `RESEND_API_KEY`
  - sender configuration used by `lib/email/sender.ts` (`EMAIL_FROM`/defaults)
- Push/PWA:
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - optional `VAPID_SUBJECT`
- Chat uploads (R2):
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_R2_BUCKET`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_ENDPOINT`
  - optional `CLOUDFLARE_R2_PUBLIC_URL`
- Deploy steps:
  - Run migrations (`prisma migrate deploy`) before app start.
  - Verify manifest/service worker/icon paths in production deployment.

## Admin setup for a new parish
1. Platform admin creates parish (`/platform/parishes`).
2. Assign clergy/admin memberships for that parish.
3. Verify default parish hub items and adjust links/visibility.
4. Create initial groups/channels appropriate for pilot ministries.
5. Publish first announcement and create first week events.
6. Seed starter serve tasks.
7. Validate request lifecycle with one member and one leader account.
8. Smoke-test EN and UK navigation/flows.

## Minimal support workflow for pilot parishes
- Single support intake mailbox/form with required issue fields: parish, role, URL, timestamp, screenshot.
- Daily triage labels: P0 blocker / P1 degraded / P2 improvement.
- Same-day response target for P0 and P1.
- Weekly pilot review: top confusion points, reliability incidents, release notes.

---

## 1-week MVP sprint plan (5 days)
- **Day 1:** Lock notification/request correctness specs; add failing regression tests.
- **Day 2:** Ship P0 notification href/read-state fixes.
- **Day 3:** Ship P0 request flow hardening + role-path tests.
- **Day 4:** Ship i18n pilot-critical cleanup + onboarding/empty-state UX improvements.
- **Day 5:** Security/parish-isolation sweep + pilot launch dry run.

## 4-week pilot hardening plan
- **Week 1:** Stabilize P0 in pilot environment and monitor defects.
- **Week 2:** Ship P1 chat search/pagination + basic moderation actions.
- **Week 3:** Ship reliability tooling (structured logs, failure panel) + notification preferences.
- **Week 4:** Ship telemetry basics + backup/restore drill + pilot feedback convergence.
