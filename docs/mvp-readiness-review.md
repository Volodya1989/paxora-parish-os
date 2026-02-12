# 1) MVP Readiness Scorecard

## Investigation coverage (confirmed in code)
- Prisma data model and migrations: `prisma/schema.prisma`, `prisma/migrations/*`.
- Route map and navigation: `app/[locale]/(app)/**/page.tsx`, `components/navigation/navItems.ts`, `lib/navigation/routes.ts`.
- Role/auth/access gates: `server/auth/permissions.ts`, `app/[locale]/(app)/layout.tsx`, `lib/queries/requests.ts`, `server/actions/chat.ts`.
- Notifications and read state: `lib/queries/notifications.ts`, `app/api/notifications/route.ts`, `app/api/notifications/mark-read/route.ts`, `components/notifications/useNotifications.ts`, `components/notifications/NotificationAutoClear.tsx`, `lib/notifications/notify.ts`.
- i18n: `lib/i18n/config.ts`, `lib/i18n/routing.ts`, `lib/i18n/translator.ts`, `messages/en.json`, `messages/uk.json`, `messages/es.json`, `components/i18n/LocalePersistence.tsx`, `components/navigation/LanguageSwitcher.tsx`.
- Chat/media: `lib/queries/chat.ts`, `server/actions/chat.ts`, `app/api/chat/[channelId]/*`, `app/api/chat/images/[...key]/route.ts`, `components/chat/*`.
- Requests flow: `server/actions/requests.ts`, `lib/queries/requests.ts`, `components/requests/*`, `app/[locale]/(app)/requests/*`, `app/[locale]/(app)/admin/requests/page.tsx`.
- PWA/push: `app/manifest.ts`, `components/pwa/EngagementPrompts.tsx`, `components/push/PushRegistration.tsx`, `components/push/PushNotificationToggle.tsx`, `lib/pwa/*`, `app/api/push/*`.

| Area | Current Status | Risk | What’s missing | Effort |
|---|---|---:|---|---:|
| Auth/Onboarding | Partial | Med | First-login path exists (post-login/access/parish setup), but no guided parishioner onboarding checklist/profile completion gate. | M |
| Roles/Permissions (parishioner/admin/clergy) | Partial | Med | Core role checks exist, but not all routes/actions consistently enforce nuanced visibility; admin vs shepherd request visibility still complex. | M |
| Navigation/IA | Partial | Med | IA is broad (This Week/Serve/Groups/Calendar/Parish + More), but weekly rhythm can feel split between `/tasks` and `/serve-board`. | S |
| Announcements | Implemented | Low | Core CRUD + publish + audience list + sanitization are present; needs polish on empty states and moderation policy text. | S |
| Events | Implemented | Low | Calendar/events and RSVP are present; needs stronger mobile event request flow clarity and reminders UX copy. | S |
| Chat | Partial | Med | Supports attachments/replies/reactions/polls + polling/history. Missing search and explicit message-level moderation workflow. | M |
| Groups | Implemented | Low | Group creation/membership/policies/chat integration present; could use simpler member-facing join guidance. | S |
| Serve/Tasks | Implemented | Low | Strong task operations and approvals; split between tasks and serve-board could confuse pilot users. | S |
| Requests | Partial | High | End-to-end exists, but must tighten visibility guarantees and ensure clergy/admin discoverability with clear notification links and board states. | M |
| Notifications (bell + persistence) | Partial | High | Persistent `Notification` table exists, but fallback/generated vs stored behavior is mixed; unread semantics can diverge across categories. | M |
| Volunteer hours visibility | Partial | Med | Displayed in tasks/serve-board/profile; no single canonical “why this number” drill-down for parishioners. | S |
| Media uploads (chat/images) | Partial | High | Upload auth is strong, but image GET endpoint streams by key prefix without per-user access check. | M |
| i18n (English/Ukrainian) | Implemented | Low | EN/UK parity is good; process for adding locales exists but Spanish file is incomplete. | S |
| Admin parish management | Implemented | Low | Platform parish create/edit + impersonation exists; needs operational runbook and safer production guardrails. | S |
| Accessibility | Partial | Med | Reasonable semantics in many components, but no explicit a11y regression tests and several raw `<img>` warnings remain. | M |
| Performance | Partial | Med | Chat polling and potentially large notification fan-out create scale risks for 1–3 parishes with high chat activity. | M |
| Reliability/Logging | Partial | Med | DeliveryAttempt + reliability page exists; no centralized error tracking/alerts/SLO dashboards. | M |
| Analytics/Telemetry | Missing | Med | No product analytics/weekly usage telemetry instrumentation found. | M |
| Content moderation/safety basics | Partial | Med | HTML sanitize for announcements and chat file constraints exist; no abuse reporting/keyword filters/mod tools for pilot admins. | M |
| Data backup/migrations | Partial | Med | Migration discipline is present and build runs migrate deploy; backup/restore procedure not codified in repo docs. | M |
| Mobile/PWA readiness | Partial | Med | Manifest, service worker registration, A2HS prompts and push subscription exist; install-to-notification timing needs tighter UX sequencing. | S |

# 2) “MVP Definition” (exact scope)

- Parishioner signs in, gets parish access approved, and lands in a clear weekly home view.
- Weekly communication is anchored in Announcements and This Week highlights.
- Core participation loops are available: RSVP to events, join group activity, complete serve tasks.
- Requests are simple and reliable: submit request, track status, receive updates.
- Chat supports practical coordination (text + image attachments + thread replies) without becoming social-media heavy.
- Notifications provide dependable reminders for messages/tasks/announcements/events/requests, with clear read state.
- Admin/clergy can manage people access, requests triage, and key parish content without developer help.
- English and Ukrainian user experience is production-complete for all pilot-critical screens.
- Mobile web + installable PWA flow is smooth for weekly return usage.
- Reliability baseline exists: migration safety, delivery failure visibility, and basic support process.

## Explicitly OUT of scope for MVP
- Deep analytics dashboards and advanced engagement metrics.
- Full moderation suite (automated classifiers, advanced abuse tooling).
- Rich chat search/history export.
- Complex records systems (sacramental registers, donations/accounting).
- Multi-language expansion beyond EN/UK completion (Spanish can be staged after MVP hardening).
- Enterprise-grade tenancy automation beyond current platform admin tools.

# 3) Top Priorities (P0/P1/P2)

## P0 (must ship for pilot)

### P0-1: Lock down chat image access by membership/room authorization
- **User problem:** Private/group chat images may be retrievable if URL key is known.
- **Acceptance criteria:**
  - Image GET validates session, active parish, and room membership/role before streaming object.
  - Group/private channels enforce same access model as message APIs.
  - Unauthorized requests return 401/403 without leaking existence.
- **Implementation notes:** Reuse channel access checks from upload/message actions.
- **Likely files/dirs impacted:** `app/api/chat/images/[...key]/route.ts`, `server/actions/chat.ts` (shared helper extraction), `lib/queries/chat.ts`.
- **Test plan:**
  - Manual: signed-in member/non-member fetch attempts against same image URL.
  - Automated: route tests for 200/401/403 across channel types.

### P0-2: Normalize notification unread/read consistency
- **User problem:** Bell count can diverge across stored notifications and fallback-generated items.
- **Acceptance criteria:**
  - Notification center count always equals unread persisted rows.
  - Category read and “mark all” produce deterministic updates.
  - Last-seen timestamps only influence legacy fallback mode (or fallback removed).
- **Implementation notes:** Prefer fully persisted notification path; reduce or gate fallback generation.
- **Likely files/dirs impacted:** `lib/queries/notifications.ts`, `app/api/notifications/mark-read/route.ts`, `components/notifications/useNotifications.ts`, `components/notifications/NotificationAutoClear.tsx`, `lib/notifications/notify.ts`.
- **Test plan:**
  - Manual: create each notification type and verify counts and read transitions.
  - Automated: integration tests for mark-read permutations.

### P0-3: Hard-verify requests visibility and clergy/admin inbox reliability
- **User problem:** Pastoral requests must never “disappear” or show to wrong audience.
- **Acceptance criteria:**
  - Submitter always sees own active requests + status updates.
  - Clergy/shepherd see all according to scope policy; admin sees allowed subset.
  - Request creation triggers in-app notification to eligible leaders.
- **Implementation notes:** enforce `canViewRequest` everywhere; ensure notification recipients match scope.
- **Likely files/dirs impacted:** `server/actions/requests.ts`, `lib/queries/requests.ts`, `lib/queries/notifications.ts`, `lib/notifications/notify.ts`, `components/requests/RequestsBoard.tsx`.
- **Test plan:**
  - Manual role-matrix walkthrough (member/admin/shepherd).
  - Automated: permission matrix tests for list/detail/notification recipients.

### P0-4: Pilot-ready onboarding clarity for first login
- **User problem:** New users can stall at access/setup without clear next action.
- **Acceptance criteria:**
  - Post-login path always lands on one clear state: verify email, request access, waiting, or approved home.
  - Copy and CTA explicitly explain what happens next.
  - Required minimal profile fields surfaced after approval.
- **Implementation notes:** use existing access states; keep UI minimal and parishioner-first.
- **Likely files/dirs impacted:** `app/[locale]/(auth)/post-login/page.tsx`, `app/[locale]/(gate)/access/page.tsx`, `components/access/AccessGateContent.tsx`, `components/setup/ParishSetup.tsx`.
- **Test plan:**
  - Manual: unverified/none/pending/approved scenarios.
  - Automated: route-state tests for redirects.

### P0-5: Consolidate Serve vs Tasks wayfinding
- **User problem:** Two task-oriented surfaces can confuse weekly rhythm adoption.
- **Acceptance criteria:**
  - Navigation language clarifies difference (personal tasks vs board view).
  - Empty states route users to the right next action.
  - No duplicate “create task” confusion.
- **Implementation notes:** keep both pages; tighten labels, helper text, and cross-links.
- **Likely files/dirs impacted:** `lib/navigation/routes.ts`, `components/navigation/navItems.ts`, `app/[locale]/(app)/tasks/page.tsx`, `app/[locale]/(app)/serve-board/page.tsx`, `components/tasks/TasksEmptyState.tsx`.
- **Test plan:**
  - Manual mobile/desktop walkthrough from This Week.
  - Automated snapshot tests for nav labels and empty states.

## P1 (ship soon after pilot start)

### P1-1: Add chat search (channel-local text)
- **User problem:** Active channels become hard to navigate without search.
- **Acceptance criteria:** search by keyword returns recent matches with jump-to-message.
- **Implementation notes:** indexed query on `ChatMessage.body`; scoped by channel + permissions.
- **Likely files:** `lib/queries/chat.ts`, `app/api/chat/[channelId]/search/route.ts` (new), `components/chat/ChatView.tsx`.
- **Test plan:** manual message corpus search + auth tests.

### P1-2: Improve i18n expansion path (Spanish-ready completeness tooling)
- **User problem:** Spanish exists as partial file; expansion risks regressions.
- **Acceptance criteria:** CI check fails on missing keys for enabled locales; optional report for draft locales.
- **Implementation notes:** lightweight script comparing key parity against EN.
- **Likely files:** `messages/*.json`, `package.json`, `scripts/i18n-keys-check.ts` (new).
- **Test plan:** automated key parity command.

### P1-3: Request detail timeline UX polishing
- **User problem:** Requesters/admins need clearer status history and next expected action.
- **Acceptance criteria:** timeline entries are readable; each status explains expected follow-up.
- **Implementation notes:** reuse existing request details history payload.
- **Likely files:** `components/requests/RequestsBoard.tsx`, `components/requests/RequestDetailActions.tsx`, `lib/requests/details.ts`.
- **Test plan:** manual role-based review.

### P1-4: Accessibility pass on key weekly flows
- **User problem:** pilot users include older parishioners; accessibility consistency matters.
- **Acceptance criteria:** keyboard access + focus order + labels pass on auth/home/tasks/requests/chat.
- **Implementation notes:** address existing lint image warnings and missing aria labels where relevant.
- **Likely files:** auth pages, header/chat components.
- **Test plan:** manual keyboard run + automated a11y checks (axe/playwright).

### P1-5: Notification volume controls for leaders
- **User problem:** leaders can receive noisy notifications from approvals + chat.
- **Acceptance criteria:** per-category in-app preference controls visible and effective.
- **Implementation notes:** preference fields already exist on `User`.
- **Likely files:** `components/profile/ProfileSettings.tsx`, `lib/notifications/notify.ts`, `app/actions/profile.ts`.
- **Test plan:** toggle settings then verify notification creation behavior.

## P2 (later)

### P2-1: Lightweight analytics for weekly active participation
### P2-2: Basic content safety workflows (report message/request flagging)
### P2-3: Smarter chat pagination for high-volume channels
### P2-4: Back-office backup/restore CLI docs + dry-run scripts
### P2-5: Advanced mobile polish (offline cues, optimistic UI patterns)

# 4) UX / Product Gaps

- **Confusing dual task surfaces:** `/tasks` and `/serve-board` overlap; users may not know where to act first.
  - Improvement: keep `/tasks` as primary “My Serve” and present `/serve-board` as leader/team board with explicit subtitle and CTA link.
- **Admin-heavy request board copy:** some panels read operationally dense for pilot clergy.
  - Improvement: simplify section titles (“Need response”, “Scheduled”, “Completed”) and show brief pastoral-oriented helper text.
- **Missing empty-state coaching:** multiple screens rely on blank lists with minimal guidance.
  - Improvement: use existing `list-empty-state` pattern to add one next action CTA + short explanation.
- **Confirmation/toast consistency:** success/error feedback is mixed across flows.
  - Improvement: standardize toast copy and status levels for create/update/archive actions.
- **Mobile composer density in chat:** rich composer is powerful but can feel crowded.
  - Improvement: collapse less-used actions behind a compact sheet, preserve large send target.
- **Access/onboarding uncertainty:** waiting/verification states need stronger expectation setting.
  - Improvement: explicit “what happens next” line + reminder of expected response time.

# 5) Technical & Data Integrity Review

## Prisma/data model safety
- Multi-tenant keying is generally explicit (`parishId` across major models) and read queries mostly filter by active parish.
- Notification, requests, chat read state, and delivery attempts have practical indexes.
- Long migration history indicates active schema evolution; app build runs `prisma migrate deploy`.

## Permissions and parish isolation
- Strong checks in many server actions (`requireAdminOrShepherd`, membership checks, channel access checks).
- **High-risk finding:** chat image fetch route validates only object key prefix and file extension, not user/session/channel membership.

## Notifications/read state
- System has two modes: persisted `Notification` rows and computed fallback from domain “last seen” signals.
- `getNotificationItems` returns stored notifications when any exist, otherwise computes fallback. This mixed strategy can produce inconsistent mental model during transition periods.
- Auto-clear on route navigation marks categories read quickly, but chat read is delegated differently (room read state), which can feel inconsistent to users.

## Requests flow integrity
- End-to-end path exists: create, board listing, detail, status transitions, scheduling, email + in-app notifications.
- Visibility uses `canViewRequest` for detail and leader filtering logic for board.
- Risk remains in complexity of admin vs shepherd visibility and notification recipient logic; pilot must validate role matrix thoroughly.

## Race conditions / recipient correctness
- Parish creation slug has collision retry path (good).
- Notification fan-out (`createMany`) can grow quickly for active channels; risk is operational scale rather than correctness for pilot size.
- Request and notification updates are mostly single-write then revalidate; no hard transactional envelope around multi-step notification + status side effects.

## Potential N+1 / query concerns
- Chat and notifications use multiple queries, including raw SQL unread counts and per-category fetches.
- For pilot scope this is acceptable, but higher-volume parishes may require consolidation and caching.

# 6) “Pilot Launch Checklist”

## Config/env checklist
- Verify `DATABASE_URL` is set and migration target DB is correct.
- Ensure `NEXTAUTH_*` secrets are configured and stable between deploys.
- Configure email provider credentials and sender domain settings for request/verification/digest flows.
- Configure web-push keys and endpoints for push subscription APIs.
- Confirm R2/object storage credentials for chat attachments.
- Validate `npm run build` (runs `prisma migrate deploy`) in CI/CD.
- Confirm static assets/icons used by `manifest.ts` exist in `public/`.

## DB migration and data safety steps
1. Backup database snapshot before deploy.
2. Run migrations in staging and smoke test auth/requests/chat.
3. Run migrations in production.
4. Seed or bootstrap required parish defaults (hub items, roles) for pilots.
5. Validate rollback plan and migration lock integrity.

## Admin setup steps for a new parish
1. Platform admin creates parish in `/platform/parishes`.
2. Assign initial clergy/shepherd and admin memberships.
3. Confirm active parish assignment for key leaders.
4. Configure default locale/timezone/parish profile.
5. Initialize default parish hub links/items.
6. Create starter groups (e.g., liturgy, hospitality, youth) and coordinators.
7. Publish first announcement + first week events/tasks.
8. Verify request board visibility for clergy/admin.

## Minimal support workflow for pilots
- In-app: direct users to a single support contact card in Parish Hub.
- Intake: collect parish, user role, page URL, timestamp, screenshot.
- Severity triage:
  - Sev-1 data/privacy/authorization
  - Sev-2 blocked weekly workflow
  - Sev-3 UX polish
- Response targets: same-day for Sev-1/2 during pilot.
- Weekly pilot review: summarize top 5 friction points and fixes.

## GitHub-issue-ready tasks (>=15)

1. **[P0] Protect chat image GET route with membership authorization**
   - Acceptance: unauthorized users cannot fetch group/private channel images by URL.
2. **[P0] Unify notification source of truth to persisted unread rows**
   - Acceptance: bell count equals unread stored notifications in all states.
3. **[P0] Add notification integration tests for mark-read (single/category/all)**
   - Acceptance: tests cover readAt + lastSeen updates with deterministic assertions.
4. **[P0] Role-matrix tests for requests visibility (member/admin/shepherd)**
   - Acceptance: list/detail permissions match `canViewRequest` policy for all scopes.
5. **[P0] Ensure request creation notifies eligible leaders by visibility scope**
   - Acceptance: leaders receive in-app notifications; excluded users do not.
6. **[P0] Clarify onboarding copy and CTA sequencing on access page**
   - Acceptance: each access state shows one primary next action and expected timeline.
7. **[P0] Distinguish Tasks vs Serve Board IA labels and helper text**
   - Acceptance: users can explain difference in usability test without assistance.
8. **[P1] Add channel-level chat search endpoint and UI**
   - Acceptance: keyword search returns paged results and jump-to-message works.
9. **[P1] Add i18n parity check script for enabled locales**
   - Acceptance: CI fails when EN/UK keys diverge.
10. **[P1] Introduce draft-locale completeness report (Spanish)**
    - Acceptance: command outputs missing key count and list for ES.
11. **[P1] Standardize toasts across requests/task/chat mutation flows**
    - Acceptance: every mutation has success/failure feedback with consistent tone.
12. **[P1] Add empty-state coaching CTAs for requests/groups/chat/tasks**
    - Acceptance: each empty state provides next step link/action.
13. **[P1] A11y audit for top 5 pilot journeys + fixes**
    - Acceptance: keyboard-only pass and no critical axe violations.
14. **[P1] Add notification preference controls for all in-app categories**
    - Acceptance: toggles in profile map to `notify*InApp` fields and affect delivery.
15. **[P2] Implement backup/restore runbook in docs with dry-run commands**
    - Acceptance: ops can perform restore in staging using documented steps.
16. **[P2] Add lightweight product telemetry for weekly active participation**
    - Acceptance: captures WAU, announcement views, request completions (non-invasive).
17. **[P2] Add basic abuse reporting for chat messages**
    - Acceptance: users can flag message; leaders can review flagged queue.
18. **[P2] Optimize notification fan-out for high-volume channels**
    - Acceptance: benchmark shows controlled write amplification for active chats.

## 1-week MVP sprint plan (5 days)
- **Day 1:** P0 security hardening (chat image auth), notification model decision, role-matrix test scaffolding.
- **Day 2:** Implement notification consistency fixes + mark-read tests.
- **Day 3:** Requests visibility + recipient correctness fixes; onboard flow copy/CTA polish.
- **Day 4:** Tasks vs Serve IA improvements + critical empty-state/toast pass.
- **Day 5:** Full pilot smoke test (member/admin/shepherd), bug bash, release candidate.

## 4-week pilot hardening plan
- **Week 1:** Stabilize P0 fixes in production-like pilot env; monitor reliability + support tickets daily.
- **Week 2:** P1 usability and a11y improvements; roll out chat search and localization tooling.
- **Week 3:** Notification preference refinements, performance tuning for chat/notifications, operator runbooks.
- **Week 4:** Instrument lightweight telemetry, summarize pilot outcomes, finalize post-pilot roadmap with P2 sequencing.
