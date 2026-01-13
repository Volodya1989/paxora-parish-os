# Paxora Parish OS – Direction A Implementation Stories

This document breaks the Direction A UX mockups into independently mergeable engineering stories with tests.
Stories are prioritized: Foundations → Layout → UI Kit → This Week → other pages.

---

## Status
- ✅ A-001 … A-010 DONE
- ⏭️ Next: A-011 Home (This Week hero + Community preview)
- ⏭️ Then: A-012 Sign-in styling, A-012.5 Onboarding + access gating
- ⏭️ Then: A-013 Roles/Membership
- ⏭️ Then: A-014 Chat MVP (+ optional A-014.1 replies)

**Recommended next build order**
1. A-011 Home (main parishioner surface + Community preview)
2. A-012 Sign-in styling
3. A-012.5 Onboarding + access gating
4. A-013 Roles + membership
5. A-014 Chat MVP
6. A-014.1 Reply-to-message (optional)

---

## A-001 — Design tokens + base styles
**Goal:** Establish the Direction A visual foundation in Tailwind for consistent use across the app.

**Scope**
- Add Tailwind token mappings (colors, spacing, radius, shadows, typography scale).
- Define base text styles and utility classes for headings/body/captions.
- Standardize focus-visible ring utility.

**Acceptance Criteria**
- Tokens match Direction A spec (emerald + warm neutrals, radius/shadows).
- Base typography utilities exist and are applied by sample components.
- Focus ring utility available and documented.

**Test Plan**
- Unit tests: `tests/unit/design-tokens.test.ts` verifying token exports/utilities (if exported).
- Integration tests: N/A.
- Mock vs real: No DB/auth/time.

**Files/Routes likely touched**
- `tailwind.config.ts`
- `app/globals.css` or `app/styles/*`
- `lib/ui/tokens.ts` (if created)

**Dependencies:** None

**Est. size:** S

---

## A-002 — App shell layout with responsive navigation
**Goal:** Provide the global layout with desktop sidebar and mobile bottom tabs.

**Scope**
- Desktop sidebar (collapsible) with “This Week” pinned first.
- Mobile bottom tabs with active state + More drawer.
- Top header region for page title + week switcher + “+ Add”.
- Profile + sign out entry points.

**Acceptance Criteria**
- Mobile and desktop nav render correctly at breakpoints.
- “This Week” is visually primary in nav.
- More drawer opens and contains Announcements/Profile/Sign out.

**Test Plan**
- Unit tests:
  - `tests/unit/nav-sidebar.test.tsx` (render + active state + a11y labels).
  - `tests/unit/nav-tabs.test.tsx` (tabs render + active state).
- Integration tests: N/A.
- Mock vs real: No DB/auth/time.

**Files/Routes likely touched**
- `app/(app)/layout.tsx`
- `components/navigation/*`
- `components/header/*`

**Dependencies:** A-001

**Est. size:** M

---

## A-003 — UI kit components (Direction A)
**Goal:** Provide reusable components matching the mockups and tokens.

**Scope**
- Button, Card, Badge, Input, Tabs, Filters, Dropdown, Modal/Drawer, Toast, EmptyState, Skeleton.
- a11y attributes on menus and toasts.

**Acceptance Criteria**
- Components match token styling and are composable.
- Toast supports Undo action.
- Dropdown menus have `aria-label`.

**Test Plan**
- Unit tests:
  - `tests/unit/ui-button.test.tsx` (variants render).
  - `tests/unit/ui-dropdown.test.tsx` (menu opens + aria-label).
  - `tests/unit/ui-toast.test.tsx` (aria-live + undo action).
- Integration tests: N/A.
- Mock vs real: No DB/auth/time.

**Files/Routes likely touched**
- `components/ui/*`
- `lib/ui/*`

**Dependencies:** A-001

**Est. size:** M

---

## A-004 — This Week page layout + data skeleton
**Goal:** Implement the primary “This Week” surface with progress ring and sections.

**Scope**
- Header: title, completion chip, progress ring, week switcher, “+ Add”.
- Sections: Tasks, Events, Announcements preview.
- Loading skeletons and empty states.

**Acceptance Criteria**
- Progress ring and completion chip visible in header.
- Sections render with empty states when no data.
- Responsive layout matches Direction A spec.

**Test Plan**
- Unit tests:
  - `tests/unit/this-week-header.test.tsx` (progress ring + chip).
- Integration tests:
  - `tests/integration/this-week-data.test.ts` (fetch tasks/events/announcements).
- Mock vs real:
  - DB: real test DB.
  - Auth: mocked user session.
  - Time: inject `getNow()` or freeze time.

**Files/Routes likely touched**
- `app/(app)/this-week/page.tsx`
- `components/this-week/*`
- `lib/queries/this-week.ts`

**Dependencies:** A-001, A-002, A-003

**Est. size:** L

**Test Data:** Seed tasks/events/announcements for the current week.

---

## A-005 — Tasks list UI + CRUD actions
**Goal:** Provide Tasks list with create/edit/complete/archive affordances.

**Scope**
- Tasks list layout, filters, status chips, kebab menus.
- Empty state CTA and completion toast with Undo.
- Server actions/queries for list + update completion + archive.

**Acceptance Criteria**
- Tasks list renders with correct status chips and actions.
- Complete/Uncomplete updates UI and triggers toast with Undo.
- Archive action soft-deletes tasks.

**Test Plan**
- Unit tests:
  - `tests/unit/task-row.test.tsx` (renders status + actions).
- Integration tests:
  - `tests/integration/tasks-crud.test.ts` (create, toggle complete, archive).
- Mock vs real:
  - DB: real test DB.
  - Auth: mocked.
  - Time: inject `getNow()` for due-date logic.

**Files/Routes likely touched**
- `app/(app)/tasks/page.tsx`
- `lib/queries/tasks.ts`
- `app/actions/tasks.ts`
- `components/tasks/*`

**Dependencies:** A-003, A-004

**Est. size:** L

**Test Data:** Seed tasks with varying due dates and completion states.

---

## A-006 — Calendar view (week/month)
**Goal:** Deliver calendar UI with week switcher and event details panel.

**Scope**
- Calendar grid, view toggle, event chips.
- Selected event detail panel with RSVP CTA.
- Loading + empty states.

**Acceptance Criteria**
- Week/Month toggle changes layout.
- Selecting event shows detail panel.
- Empty state appears when no events.

**Test Plan**
- Unit tests:
  - `tests/unit/calendar-toggle.test.tsx` (renders week/month).
- Integration tests:
  - `tests/integration/calendar-events.test.ts` (fetch events by week).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: inject `getNow()` for week boundaries.

**Files/Routes likely touched**
- `app/(app)/calendar/page.tsx`
- `lib/queries/events.ts`
- `components/calendar/*`

**Dependencies:** A-003

**Est. size:** M

**Test Data:** Seed events spanning current and next week.

---

## A-007 — Groups list UI + archive affordance
**Goal:** Implement Groups (ministries/teams) page with create/edit/archive and add members stub.

**Scope**
- Groups cards with member counts + avatars.
- Empty state CTA.
- Archive action (soft).

**Acceptance Criteria**
- Groups list renders; archive action available.
- Empty state CTA visible when no groups.
- Groups explicitly represent the structure that powers memberships, task visibility, and chat rooms.

**Test Plan**
- Unit tests:
  - `tests/unit/group-card.test.tsx` (renders name + count).
- Integration tests:
  - `tests/integration/groups-crud.test.ts` (create + archive).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: not needed.

**Files/Routes likely touched**
- `app/(app)/groups/page.tsx`
- `lib/queries/groups.ts`
- `app/actions/groups.ts`
- `components/groups/*`

**Dependencies:** A-003

**Est. size:** M

**Test Data:** Seed groups with varying member counts.

---

## A-008 — Announcements list + publish workflow
**Goal:** Build Announcements/Bulletin list with draft/published tabs and publish toggle.

**Scope**
- List with status chips and publish toggle.
- Archive action and empty state CTA.
- Draft/Published tabs.

**Acceptance Criteria**
- Draft and Published tabs filter correctly.
- Publish/Unpublish updates status.
- Archive available and toast with Undo.

**Test Plan**
- Unit tests:
  - `tests/unit/announcement-row.test.tsx` (status chip + toggle).
- Integration tests:
  - `tests/integration/announcements-crud.test.ts` (create, publish, archive).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: inject `getNow()` for publish timestamps.

**Files/Routes likely touched**
- `app/(app)/announcements/page.tsx`
- `lib/queries/announcements.ts`
- `app/actions/announcements.ts`
- `components/announcements/*`

**Dependencies:** A-003

**Est. size:** M

**Test Data:** Seed drafts and published announcements.

---

## A-009 — Event detail (parishioner-friendly) + RSVP
**Goal:** Provide read-first event detail view with RSVP actions.

**Scope**
- Event detail layout (date/time/location/summary).
- RSVP buttons (Yes/Maybe/No) with success toast.

**Acceptance Criteria**
- RSVP is action-light and clear.
- Successful RSVP shows toast and updates state.

**Test Plan**
- Unit tests:
  - `tests/unit/rsvp-buttons.test.tsx` (buttons render + selected state).
- Integration tests:
  - `tests/integration/event-rsvp.test.ts` (persist RSVP).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: not required.

**Files/Routes likely touched**
- `app/(app)/events/[id]/page.tsx`
- `lib/queries/events.ts`
- `app/actions/rsvp.ts`
- `components/events/*`

**Dependencies:** A-003, A-006

**Est. size:** M

**Test Data:** Seed events and RSVP states.

---

## A-010 — Profile/Settings page (basic)
**Goal:** Implement profile summary and notification toggles.

**Scope**
- Profile card (name/email/role).
- Notification + weekly digest toggles.
- Sign out button.

**Acceptance Criteria**
- Profile info visible.
- Toggles render and persist settings.

**Test Plan**
- Unit tests:
  - `tests/unit/profile-card.test.tsx` (renders info).
- Integration tests:
  - `tests/integration/profile-settings.test.ts` (update preferences).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: not required.

**Files/Routes likely touched**
- `app/(app)/profile/page.tsx`
- `lib/queries/profile.ts`
- `app/actions/profile.ts`
- `components/profile/*`

**Dependencies:** A-003

**Est. size:** S

**Test Data:** Seed user profile and preferences.

---

## A-011 — Home/Dashboard with This Week hero
**Goal:** Provide home page with This Week hero card, community preview, and quick actions.

**Scope**
- This Week hero card with progress ring + completion chip.
- Quick actions (Task, Announcement).
- Recent updates list.
- Community preview card with top 1–3 rooms (or most recent room) showing:
  - Room name.
  - Last message snippet.
  - Unread count badge (optional MVP).
  - CTA: Open chat.

**Acceptance Criteria**
- Hero card renders with completion data.
- Quick actions visible.
- Primary landing page for parishioners after sign-in is Home (/) showing This Week + Community preview.
- Home is useful even if user doesn’t use chat; if chat exists, community pulse is visible within 1 tap.

**Test Plan**
- Unit tests:
  - `tests/unit/home-hero.test.tsx` (renders ring + chip).
- Integration tests:
  - `tests/integration/home-data.test.ts` (fetch weekly summary + recent updates).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: inject `getNow()` for weekly summary.

**Files/Routes likely touched**
- `app/(app)/page.tsx`
- `lib/queries/home.ts`
- `components/home/*`

**Dependencies:** A-003, A-004

**Est. size:** M

**Test Data:** Seed tasks/events/announcements for the current week.

---

## A-012 — Sign-in page styling (Direction A)
**Goal:** Ensure the sign-in screen matches Direction A calm stewardship style.

**Scope**
- Centered card layout, inputs, and sign-in button styling.
- Optional help text alignment.

**Acceptance Criteria**
- Sign-in page matches typography + spacing tokens.
- Input labels present and accessible.

**Test Plan**
- Unit tests:
  - `tests/unit/signin-form.test.tsx` (labels and button render).
- Integration tests: N/A.
- Mock vs real: No DB/auth/time.

**Files/Routes likely touched**
- `app/(auth)/signin/page.tsx`
- `components/auth/*`

**Dependencies:** A-001, A-003

**Est. size:** S

---

## A-012.5 — Onboarding + access gating
**Goal:** Ensure new users can sign in, request access, and see clear states before joining groups.

**Scope**
- Auth entry: sign up/sign in flow with post-auth routing.
- Access states: no membership, pending approval, approved.
- On approval, user becomes an approved member (role defaults to PARISHIONER once A-013 schema exists).
- UI: “Request access” CTA, pending state messaging, and approved state entry point.
- Route guards for chat, tasks, and hours when membership is missing or pending.
- Access requests are approved by global Admin/Clergy in MVP.

**Acceptance Criteria**
- Users without membership see a request access screen instead of app features.
- Pending membership shows status and prevents access to chat/boards/hours.
- Signed-in users without approval cannot access chat, boards/tasks claiming, hours, or group pages.
- Approved users are routed to their first group context.

**Test Plan**
- Unit tests:
  - `tests/unit/access-gate.test.tsx` (renders request/pending/approved states).
- Integration tests:
  - `tests/integration/access-request-flow.test.ts` (request access + approve).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: not required.

**Files/Routes likely touched**
- `app/(app)/layout.tsx`
- `app/(app)/access/page.tsx`
- `lib/queries/access.ts`
- `app/actions/access.ts`
- `middleware.ts` (auth-only redirect; membership gating lives in layouts/pages)

**Dependencies:** A-002, A-003, A-012

**Est. size:** S

**Test Data:** Seed users with no membership and pending approvals.

---

## A-013 — Roles + membership for parish groups
**Goal:** Establish role-based membership as the backbone for chat, tasks, and service tracking.

**Scope**
- Roles:
  - Admin/Clergy: parish-wide (global) role with full access across groups.
  - Coordinator: per-group role with management rights scoped to their group.
  - Parishioner: default role on approval.
- MVP assumes a single parish instance or introduces a Parish model linked to users/memberships.
- Membership management: invite, accept/decline, remove, role change.
- Permissions matrix for group-level actions (create task, moderate chat, nominate hero).
- UI: group members list, role chips, and member invite drawer.

**Acceptance Criteria**
- Role changes persist and are enforced in UI and server actions.
- Coordinators can manage group tasks and nominations; parishioners can claim volunteer tasks.
- Invites can be sent and accepted with clear feedback states.

**Test Plan**
- Unit tests:
  - `tests/unit/member-role-chip.test.tsx` (role label + permissions hint).
- Integration tests:
  - `tests/integration/group-membership.test.ts` (invite, accept, role change).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: not required.

**Files/Routes likely touched**
- `app/(app)/groups/[id]/members/page.tsx`
- `lib/queries/members.ts`
- `app/actions/members.ts`
- `components/groups/members/*`
- `prisma/schema.prisma`

**Dependencies:** A-003, A-007

**Est. size:** L

**Test Data:** Seed groups with a mix of roles and pending invites.

---

## A-014 — Community chat MVP (rooms scoped to groups + parish)
**Goal:** Deliver a text-only parish chat experience using Slack-like rooms, scoped to groups and parish-wide channels.

**Scope**
- Community Chat MVP = rooms (channels) scoped to groups + parish-wide channels.
- Room types:
  - Announcement Channels: read-only for most, post for Admin/Clergy/Coordinator.
  - Group Chat Rooms: members can post.
- Text-only messages and pinned message per channel.
- Admin moderation: delete message, lock channel posting, add/remove members.
- UI: channel list, chat thread, composer, pinned banner, lock state.
- Backend: message model, channel model, membership enforcement, polling endpoint.
- Polling only while chat page is open (e.g., 3s interval).
- Order by createdAt asc with deterministic pagination.
- Messages protected with TLS in transit, and DB access controls; no E2EE in MVP.

**Acceptance Criteria**
- Users can read and post in allowed channels; locked channels block posting.
- Admins can delete messages and pin/unpin a message.
- Group/channel list reflects membership.

**Test Plan**
- Unit tests:
  - `tests/unit/chat-thread.test.tsx` (message render + pinned state).
  - `tests/unit/chat-composer.test.tsx` (disabled state when locked).
- Integration tests:
  - `tests/integration/chat-messages.test.ts` (post, delete, pin).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: inject `getNow()` for timestamps.

**Files/Routes likely touched**
- `app/(app)/groups/[id]/chat/page.tsx`
- `components/chat/*`
- `lib/queries/chat.ts`
- `app/actions/chat.ts`
- `prisma/schema.prisma`

**Dependencies:** A-003, A-013

**Est. size:** L

**Test Data:** Seed channels with pinned messages and mixed membership.

---

## A-014.1 — Reply-to-message (chat)
**Goal:** Add lightweight message replies without expanding beyond MVP chat (optional but recommended to reduce long-thread clutter).

**Scope**
- Reply context shown inline with parent message preview.
- Composer supports replying to a specific message.
- Backend support for parent message reference.

**Acceptance Criteria**
- Users can reply to a message and see the parent preview.
- Replies are preserved when rendering chat history.

**Test Plan**
- Unit tests:
  - `tests/unit/chat-reply-preview.test.tsx` (parent preview render).
- Integration tests:
  - `tests/integration/chat-reply-flow.test.ts` (create + render reply).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: inject `getNow()` for timestamps.

**Files/Routes likely touched**
- `components/chat/*`
- `lib/queries/chat.ts`
- `app/actions/chat.ts`
- `prisma/schema.prisma`

**Dependencies:** A-014

**Est. size:** S

**Test Data:** Seed replies with parent/child message relations.

---

## A-015 — Task board with volunteer-safe rules
**Goal:** Provide a Kanban board aligned to role-based coordination and volunteering.

**Scope**
- Boards per group (plus parish-wide board).
- Columns: To Do / In Progress / Done.
- “Open to volunteers” toggle and claim/unclaim flow.
- Task fields: owner (optional), due date, tags, priority, checklist (optional).
- UI: board view, task drawer, claim CTA, coordinator assignment controls.
- Backend: task permissions, state transitions, claim logic.

**Acceptance Criteria**
- Parishioners can only claim tasks marked “Open to volunteers.”
- Coordinators can assign/close tasks within their group.
- Status transitions update board counts and activity log (optional).

**Test Plan**
- Unit tests:
  - `tests/unit/task-claim-cta.test.tsx` (visibility and disabled states).
- Integration tests:
  - `tests/integration/task-claim-flow.test.ts` (claim/unclaim, permission checks).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: inject `getNow()` for due date handling.

**Files/Routes likely touched**
- `app/(app)/groups/[id]/tasks/page.tsx`
- `components/tasks/board/*`
- `lib/queries/tasks.ts`
- `app/actions/tasks.ts`
- `prisma/schema.prisma`

**Dependencies:** A-003, A-013

**Est. size:** L

**Test Data:** Seed tasks with volunteer/open flags and varying roles.

---

## A-016 — Volunteer hours + “Parish Week Hero” spotlight
**Goal:** Capture service hours and highlight weekly gratitude without gamification.

**Scope**
- Log actual hours on task completion (estimated vs actual).
- Hours summary dashboard (week/month) with opt-in leaderboard.
- Weekly hero nomination workflow (coordinator/admin only).
- UI: hours ledger, summary cards, hero spotlight card.
- Backend: hours entries, nomination model, privacy opt-in.

**Acceptance Criteria**
- Completing a task prompts for actual hours and persists entry.
- Hours summary aggregates by group/ministry and week/month.
- Hero spotlight shows one weekly recognition from nominations.

**Test Plan**
- Unit tests:
  - `tests/unit/hours-summary-card.test.tsx` (totals render).
  - `tests/unit/hero-spotlight.test.tsx` (nominee render + opt-in).
- Integration tests:
  - `tests/integration/hours-log.test.ts` (log hours on completion).
  - `tests/integration/hero-nomination.test.ts` (nominate + publish).
- Mock vs real:
  - DB: real.
  - Auth: mocked.
  - Time: inject `getNow()` for week boundaries.

**Files/Routes likely touched**
- `app/(app)/groups/[id]/hours/page.tsx`
- `app/(app)/this-week/page.tsx`
- `components/hours/*`
- `components/recognition/*`
- `lib/queries/hours.ts`
- `app/actions/hours.ts`
- `app/actions/recognition.ts`
- `prisma/schema.prisma`

**Dependencies:** A-003, A-013, A-015

**Est. size:** L

**Test Data:** Seed completed tasks with hours and nominations.

---

## Notes on Time/Week Handling
- Use a `getNow()` utility injected into query functions to avoid flaky tests.
- Tests should freeze time or pass a fixed `Date` into `getNow()`.
