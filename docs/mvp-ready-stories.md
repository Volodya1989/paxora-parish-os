# MVP Readiness Stories (Pilot Launch)

Source context: `docs/mvp-pilot-readiness-report.md`.

## Epic 1 — Trustworthy Access and Onboarding

### Story 1.1 — Role-aware first login guidance
**As a** newly approved user (member/admin/shepherd), **I want** to see role-specific next steps on first login **so that** I can become active in the first week.

**Acceptance criteria**
- Approved first login shows a role-specific “Start this week” card.
- Member card includes: announcements, events, groups, serve tasks, requests.
- Admin/shepherd card includes: publish announcement, create event, triage requests.
- Card is dismissible and does not reappear once completed.

### Story 1.2 — Strong access gate clarity
**As a** user awaiting approval, **I want** clear gate status and next actions **so that** I understand what to do.

**Acceptance criteria**
- Access states (`none`, `pending`, `unverified`, `approved`) show distinct copy and CTA.
- Unverified state supports resend verification email.
- Pending state confirms expected follow-up path.

---

## Epic 2 — Notifications Users Can Trust

### Story 2.1 — Request notifications always open valid destination
**As a** requester/admin/shepherd, **I want** request notifications to open the right page **so that** I can act without confusion.

**Acceptance criteria**
- Requester notification opens requester-visible request detail.
- Admin/shepherd notification opens board/detail they are authorized to view.
- No request notification href points to inaccessible route.

### Story 2.2 — Consistent read/unread behavior
**As a** user, **I want** read-state behavior to be predictable **so that** I can triage updates confidently.

**Acceptance criteria**
- “Mark one read” only affects selected item.
- “Mark category read” only affects selected category.
- “Mark all read” clears all unread items and persists after refresh.
- Unread badge count remains correct after refresh and tab switching.

### Story 2.3 — Notification preferences by category
**As a** user, **I want** to control notification categories **so that** I only get relevant updates.

**Acceptance criteria**
- Toggle controls exist for message/task/announcement/event/request categories.
- Preference changes affect newly created notifications.
- UI reflects current saved preference state.

---

## Epic 3 — Request Lifecycle Reliability

### Story 3.1 — Parishioner can submit and track requests end-to-end
**As a** parishioner, **I want** to submit a request and track updates **so that** I know it is being handled.

**Acceptance criteria**
- Submitted request appears immediately in “My Requests”.
- Request detail shows status, assignment (if any), and timeline/activity.
- Updates from staff generate visible requester notifications.

### Story 3.2 — Staff can triage requests safely
**As an** admin/shepherd, **I want** to assign/update/schedule requests with visibility controls **so that** follow-up is organized.

**Acceptance criteria**
- Staff can change status, assignee, and visibility with role rules enforced.
- Clergy-only request cannot be assigned to non-shepherd.
- All updates are persisted and visible in board/detail UI.

### Story 3.3 — Request board filters support weekly operations
**As an** admin/shepherd, **I want** practical filters (type/assignee/scope/overdue/archive) **so that** I can quickly process requests.

**Acceptance criteria**
- Filters update results consistently and are shareable via URL params.
- Overdue filter flags stale/submitted requests per policy.
- Empty-state messaging guides next action.

---

## Epic 4 — Weekly Rhythm Engagement

### Story 4.1 — Weekly home drives action
**As a** parishioner, **I want** a clear weekly hub **so that** I can quickly find what matters this week.

**Acceptance criteria**
- This Week view exposes announcements, events, serve opportunities, groups, and quick links.
- Empty states for each section include a primary CTA.
- Mobile and desktop views keep parity for critical actions.

### Story 4.2 — Announcements are reliable and safe
**As an** admin/shepherd, **I want** to publish announcements confidently **so that** parishioners receive trustworthy updates.

**Acceptance criteria**
- Draft/create/edit/publish/unpublish flow works.
- Published announcement appears for parishioners with notification.
- Announcement HTML is sanitized before render.

### Story 4.3 — Calendar supports recurring parish life
**As a** parish leader, **I want** recurring/public/group events **so that** routine parish schedules are easy to maintain.

**Acceptance criteria**
- Create/edit events with recurrence rules.
- RSVP flow works for parishioners.
- Group visibility enforces group membership constraints.

### Story 4.4 — Serve board encourages participation
**As a** parishioner, **I want** to claim/volunteer for tasks **so that** I can help this week.

**Acceptance criteria**
- Open tasks can be claimed/volunteered with status transitions.
- Completion flow records hours correctly.
- Personal hours summary is visible in serve context.


### Epic 4 implementation review (current codebase)

#### Story 4.1 — Weekly home drives action
**Implemented now**
- `/this-week` renders a role-aware parishioner home with a four-tile quick action row for announcements, services/calendar, community/groups, and opportunities/serve.
- The page includes role-aware first-week onboarding (`StartThisWeekCard`) and a dedicated groups/community section.
- Quick action navigation is responsive (`grid-cols-2` on small screens and `sm:grid-cols-4` on larger screens), preserving critical access paths on mobile and desktop.

**Needs improvement for MVP readiness**
- The parishioner page currently emphasizes quick tiles + groups, but does not yet render dedicated feed sections for announcements, upcoming events, and opportunities with “View all” patterns.
- Empty-state CTAs are not yet consistently present for each required section (announcements, events, serve, groups).
- Consider enabling anchor-style in-page quick links (or section jumps) once full section blocks are rendered.

#### Story 4.2 — Announcements are reliable and safe
**Implemented now**
- Draft/create/edit/publish/unpublish flows exist with server actions and leader permission checks.
- Publishing triggers both push and in-app notifications.
- Announcement HTML is sanitized before persistence/render via `sanitizeAnnouncementHtml`, with text fallback generation.

**Needs improvement for MVP readiness**
- Add explicit integration coverage for publish/unpublish notifications and HTML sanitization edge cases.
- Increase i18n coverage in announcements UI strings (several management toasts/messages are still hardcoded English).

#### Story 4.3 — Calendar supports recurring parish life
**Implemented now**
- Event create/edit supports recurrence (`NONE`, `DAILY`, `WEEKLY`) including interval, weekday selection, and recurrence end date validation.
- RSVP flow is implemented (`setRsvp`) and surfaced in event detail/calendar UI components.
- Group visibility constraints are enforced in creation/update and event queries (non-leaders only see allowed public/group/private-by-RSVP events).

**Needs improvement for MVP readiness**
- Add stronger end-to-end tests for recurrence expansion (timezone boundaries, weekly weekday rules, recurrence-until behavior).
- Clarify product behavior for private events + RSVP discoverability to avoid user confusion.

#### Story 4.4 — Serve board encourages participation
**Implemented now**
- Serve board supports claiming, unclaiming, volunteering, and status transitions (`OPEN` → `IN_PROGRESS` → `DONE`).
- Completion flow supports estimated/manual/skip hours logging and persists volunteer hours entries.
- Personal hours summary is visible at the top of serve board (`VolunteerHoursSummary`).

**Needs improvement for MVP readiness**
- Expand automated tests around volunteer capacity limits, approval gating, and hours-entry correctness per participant.
- Improve UX copy consistency in completion dialogs and toasts (some strings remain non-localized/hardcoded).

---

## Epic 5 — Chat and Community Communication

### Story 5.1 — Chat channels are role-safe and usable
**As a** parish user, **I want** access only to channels I am allowed to see **so that** communication stays scoped properly.

**Acceptance criteria**
- Parish/group channel visibility is role and membership aware.
- Posting permissions differ correctly for announcement/parish/group channels.
- Unauthorized channel access attempts are denied.

### Story 5.2 — Rich chat interactions for weekly coordination
**As a** user, **I want** replies/reactions/polls/attachments **so that** coordination can happen in-app.

**Acceptance criteria**
- Users can send messages with reply threading and reactions.
- Poll creation and voting work.
- Image attachments upload within size/type limits.

### Story 5.3 — Chat performance remains acceptable for pilot load
**As a** pilot parish user, **I want** chat to feel responsive **so that** weekly usage remains high.

**Acceptance criteria**
- Polling/cursor updates perform within target thresholds for pilot usage.
- Load-older history path exists for channels with larger message volume.
- UI remains usable on mobile composer layouts.

---

## Epic 6 — i18n and Clarity for Bilingual Pilots

### Story 6.1 — EN/UK parity for pilot-critical journeys
**As a** bilingual parish user, **I want** consistent language coverage **so that** I can navigate without mixed-language confusion.

**Acceptance criteria**
- Pilot-critical surfaces contain no hardcoded English strings.
- Locale persists across navigation and reload.
- Missing translation keys are eliminated for EN/UK in pilot scope.

### Story 6.2 — Locale foundation remains extensible (Spanish later)
**As a** product team, **I want** a safe path to add Spanish later **so that** we can expand without refactor.

**Acceptance criteria**
- Locale config/docs describe controlled activation of additional locale.
- Fallback behavior is explicit and test-covered.

---

## Epic 7 — Security, Reliability, and Operations

### Story 7.1 — Cross-parish isolation is enforced everywhere
**As a** parish administrator, **I want** strict parish data isolation **so that** user trust is protected.

**Acceptance criteria**
- All mutating actions/routes validate active parish and membership.
- Out-of-parish identifiers are rejected with consistent responses.
- Adversarial test suite covers high-risk endpoints.

### Story 7.2 — Operational visibility for delivery failures
**As an** operator, **I want** to see failed email/push sends **so that** I can support pilot parishes quickly.

**Acceptance criteria**
- Recent failed sends are visible in an admin reliability view.
- Failure reason/context is available for triage.
- Retry guidance is documented.

### Story 7.3 — Pilot launch runbook is executable
**As a** launch owner, **I want** a clear runbook **so that** parish onboarding is repeatable.

**Acceptance criteria**
- Env/config checklist covers auth/email/push/storage/migrations.
- New parish setup checklist is testable end-to-end.
- Support intake and triage workflow is documented and followed.

---

## Suggested MVP Sprint Cut (Must-have story set)
For a 1-week MVP sprint, prioritize: **1.1, 2.1, 2.2, 3.1, 3.2, 6.1, 7.1**.
