# Gap Analysis — Direction A vs Repo

This document compares the Direction A stories (A-001…A-012) with what exists in the repo today and highlights the missing/inconsistent pieces that will block A-013+.

## 1) Story completion verification (A-001…A-012)

> Legend: **Implemented**, **Partial**, **Missing**. Evidence references file paths that exist in the repo.

### A-001 — Design tokens + base styles
- **Status:** Implemented (tests missing).
- **Evidence:** Tailwind tokens + base typography in `tailwind.config.ts` and `app/globals.css`. Files: `tailwind.config.ts`, `app/globals.css`.
- **Gaps:** Story test `tests/unit/design-tokens.test.ts` is not present.

### A-002 — App shell layout with responsive navigation
- **Status:** Implemented.
- **Evidence:** App shell + header + nav components: `app/(app)/layout.tsx`, `components/navigation/AppShell.tsx`, `components/navigation/Sidebar.tsx`, `components/navigation/MobileTabs.tsx`, `components/header/AppHeader.tsx`.
- **Tests:** `tests/unit/nav-sidebar.test.tsx`, `tests/unit/nav-tabs.test.tsx`.

### A-003 — UI kit components
- **Status:** Implemented.
- **Evidence:** UI kit components in `components/ui/*` (Button/Card/Dropdown/Tabs/Toast/Modal/Drawer/etc). Files: `components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/Dropdown.tsx`, `components/ui/Tabs.tsx`, `components/ui/Toast.tsx`, `components/ui/Modal.tsx`, `components/ui/Drawer.tsx`.
- **Tests:** `tests/unit/ui-button.test.ts`, `tests/unit/ui-dropdown.test.ts`, `tests/unit/ui-toast.test.ts`.

### A-004 — This Week page layout + data skeleton
- **Status:** Partial.
- **Evidence:** Page layout and sections in `app/(app)/this-week/page.tsx` + components in `components/this-week/*`. Data loader in `lib/queries/this-week.ts`.
- **Gaps:** `lib/queries/this-week.ts` returns `announcements: []` (no announcement preview data), so the Announcements section does not reflect real data; test `tests/integration/this-week-data.test.ts` is not present.

### A-005 — Tasks list UI + CRUD actions
- **Status:** Implemented.
- **Evidence:** Tasks page `app/(app)/tasks/page.tsx`, UI components `components/tasks/*`, query `lib/queries/tasks.ts`, actions `server/actions/tasks.ts` + `server/actions/group-tasks.ts`.
- **Tests:** `tests/unit/task-row.test.tsx`, `tests/integration/tasks-crud.test.ts`.

### A-006 — Calendar view (week/month)
- **Status:** Partial.
- **Evidence:** Calendar page `app/(app)/calendar/page.tsx`, UI `components/calendar/CalendarView.tsx`, queries `lib/queries/events.ts`, unit test `tests/unit/calendar-toggle.test.tsx`.
- **Gaps:** Event detail panel (`components/calendar/EventDetailPanel.tsx`) does not include RSVP CTA (only “View details”), and event CRUD flows are placeholders in `app/(app)/calendar/events/[eventId]/edit/page.tsx` + `app/(app)/calendar/events/[eventId]/delete/page.tsx`.

### A-007 — Groups list UI + archive affordance
- **Status:** Implemented.
- **Evidence:** Groups page `app/(app)/groups/page.tsx`, UI `components/groups/GroupsView.tsx` + `components/groups/GroupCard.tsx`, query `lib/queries/groups.ts`, actions `server/actions/groups.ts`.
- **Tests:** `tests/unit/group-card.test.tsx`, `tests/integration/groups-crud.test.ts`.

### A-008 — Announcements list + publish workflow
- **Status:** Implemented (creation UI is minimal).
- **Evidence:** Announcements page `app/(app)/announcements/page.tsx`, UI `components/announcements/AnnouncementsView.tsx` + `components/announcements/AnnouncementRow.tsx`, actions `server/actions/announcements.ts`, query `lib/queries/announcements.ts`.
- **Tests:** `tests/unit/announcement-row.test.tsx`, `tests/integration/announcements-crud.test.ts`.
- **Gaps:** `/announcements/new` is a placeholder screen (`app/(app)/announcements/new/page.tsx`), so editing/authoring remains minimal.

### A-009 — Event detail (parishioner-friendly) + RSVP
- **Status:** Implemented.
- **Evidence:** Event detail page `app/(app)/events/[id]/page.tsx`, UI `components/events/EventDetailCard.tsx` + `components/events/RsvpButtons.tsx`, RSVP action `app/actions/rsvp.ts`, query `lib/queries/events.ts`.
- **Tests:** `tests/unit/rsvp-buttons.test.tsx`, `tests/integration/event-rsvp.test.ts`.

### A-010 — Profile/Settings page (basic)
- **Status:** Implemented.
- **Evidence:** Profile page `app/(app)/profile/page.tsx`, UI `components/profile/ProfileCard.tsx` + `components/profile/ProfileSettings.tsx`, query `lib/queries/profile.ts`, action `app/actions/profile.ts`.
- **Tests:** `tests/unit/profile-card.test.tsx`, `tests/integration/profile-settings.test.ts`.

### A-011 — Home/Dashboard with This Week hero
- **Status:** Partial.
- **Evidence:** Home page `app/(app)/page.tsx`, home query `lib/queries/home.ts`, home components `components/home/*`.
- **Gaps:** `listCommunityRoomsPreview()` returns an empty array with TODO for chat integration, so community preview is stubbed; sign-in redirects to `/this-week` (not `/`), which conflicts with “Home is primary landing” requirement (`app/(auth)/sign-in/page.tsx`).

### A-012 — Sign-in page styling
- **Status:** Implemented (tests missing).
- **Evidence:** Styled sign-in page in `app/(auth)/sign-in/page.tsx`.
- **Gaps:** Test `tests/unit/signin-form.test.tsx` is not present.

## 2) Major functionality gaps (cross-story)

### Calendar
- Event detail panel lacks RSVP CTA (`components/calendar/EventDetailPanel.tsx`), so the calendar surface does not provide RSVP affordance despite A-006 scope.
- Event edit/delete pages are placeholders, and no create flow is exposed in the calendar UI (`app/(app)/calendar/events/[eventId]/edit/page.tsx`, `app/(app)/calendar/events/[eventId]/delete/page.tsx`).
- `lib/queries/events.ts` returns `summary: null` in calendar list results, limiting event details surfaced in grid views.

### Tasks
- Task model is week-scoped and owner-scoped, but lacks volunteer/claim fields needed for A-015 (no “open to volunteers,” claim/unclaim, or board status in `prisma/schema.prisma`).
- No task board routes or UI exist (no `app/(app)/groups/[id]/tasks/page.tsx`), and no board components exist.

### Groups
- Groups list and archive exist, but membership management is limited to role changes through `server/actions/groups.ts`; there is no invite/accept workflow or membership request state to satisfy A-013.
- Group detail page is read-only and does not expose membership management or group-level permissions UI (`app/(app)/groups/[groupId]/page.tsx`).

### Roles/Membership
- Schema includes ParishRole and GroupRole but lacks the Coordinator role and invitation/approval status needed by A-013 (`prisma/schema.prisma`).
- `lib/permissions/index.ts` only defines leader checks and lacks a full permissions matrix aligned to A-013.

### Access gating (A-012.5)
- `app/(app)/layout.tsx` gates only on `activeParishId` and auto-bootstraps parish membership (`server/auth/bootstrap.ts`), but there is no access-request or pending-approval state.
- No access request routes/actions/queries exist (expected `app/(app)/access/page.tsx`, `app/actions/access.ts`, `lib/queries/access.ts`).

### Chat readiness (A-014)
- No chat models (channels/messages) exist in `prisma/schema.prisma`.
- Home’s community preview is stubbed (`lib/queries/home.ts`), and no chat routes or components exist.

### Home surface
- Home exists, but sign-in redirects to `/this-week`, not `/`, so Home is not the primary landing surface per A-011 (`app/(auth)/sign-in/page.tsx`).

## 3) Dependency risks (A-013…A-016)

- **A-013 Roles/Membership:** Missing Coordinator role, membership invite/accept status, and member management UI will block role enforcement and invite workflows. Existing schema only supports MEMBER/ADMIN/SHEPHERD and group LEAD/MEMBER (`prisma/schema.prisma`, `lib/permissions/index.ts`).
- **A-014 Chat MVP:** No channel/message schema, no routes, and no membership-aware queries. Home community preview is stubbed, so there is no foundation for chat rooms (`lib/queries/home.ts`).
- **A-015 Task Board:** Schema lacks volunteer flags, board status, and claim logic; no group-level task board route/components exist. Current tasks are list-only in `/tasks` (`app/(app)/tasks/page.tsx`, `lib/queries/tasks.ts`).
- **A-016 Hours + Recognition:** No hours/nomination models or actions exist in `prisma/schema.prisma` or `server/actions/*`. Existing task model does not store actual/estimated hours.

## 4) Fix-first list (prioritized)

### Critical (blocks A-013+ or correctness)
1. **Membership/access gating**: Add access request + pending approval state and route guards (A-012.5). Currently only auto-bootstrapped parish creation exists (`app/(app)/layout.tsx`, `server/auth/bootstrap.ts`).
2. **Role expansion**: Introduce Coordinator role + membership status fields, along with permissions matrix and server enforcement (A-013 prerequisites). Current schema lacks these fields (`prisma/schema.prisma`).
3. **Chat schema + routing foundation**: Add channel/message models and membership-scoped queries to unblock A-014; home community preview is stubbed (`lib/queries/home.ts`).

### Important (major UX gaps)
1. **Calendar event detail panel CTA**: Add RSVP CTA or contextual link from calendar panel to event detail (A-006 alignment). Current panel is read-only (`components/calendar/EventDetailPanel.tsx`).
2. **Tasks board/volunteer flow**: Add claim/unclaim + board view model and UI (A-015). Current tasks are list-only (`app/(app)/tasks/page.tsx`).
3. **Group membership management UI**: Add invite/accept/role-change UX to match A-013. Current group detail is read-only (`app/(app)/groups/[groupId]/page.tsx`).

### Nice-to-have (polish)
1. **Announcements authoring surface**: Replace `/announcements/new` placeholder with editor workflow (`app/(app)/announcements/new/page.tsx`).
2. **Testing gaps**: Add missing unit/integration tests for A-001, A-004, A-012, A-012.5.
