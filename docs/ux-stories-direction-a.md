# Paxora Parish OS – Direction A Implementation Stories

This document breaks the Direction A UX mockups into independently mergeable engineering stories with tests.
Stories are prioritized: Foundations → Layout → UI Kit → This Week → other pages.

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
**Goal:** Implement Groups page with create/edit/archive and add members stub.

**Scope**
- Groups cards with member counts + avatars.
- Empty state CTA.
- Archive action (soft).

**Acceptance Criteria**
- Groups list renders; archive action available.
- Empty state CTA visible when no groups.

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
**Goal:** Provide home page with This Week hero card and quick actions.

**Scope**
- This Week hero card with progress ring + completion chip.
- Quick actions (Task, Announcement).
- Recent updates list.

**Acceptance Criteria**
- Hero card renders with completion data.
- Quick actions visible.

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

## Notes on Time/Week Handling
- Use a `getNow()` utility injected into query functions to avoid flaky tests.
- Tests should freeze time or pass a fixed `Date` into `getNow()`.
