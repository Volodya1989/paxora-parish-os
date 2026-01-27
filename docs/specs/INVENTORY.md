# Inventory (Direction A audit)

This inventory maps the current repo surface area to Direction A stories (A-001…A-012) and later dependencies. It focuses on what **exists today** and highlights route/action/model coverage.

## 0) Story prompts & implementation briefs
- **Bilingual i18n skeleton prompt**: `docs/specs/i18n-skeleton-prompt.md` (guidance for locale routing, translation scope, toggle UX, and tests).

## 1) Routes & pages (app router)

### App routes (`app/(app)/**`)
- **Home** (`/`) → `app/(app)/page.tsx` (A-011). Uses home summary + community preview components. File: `app/(app)/page.tsx`.
- **This Week** (`/this-week`) → `app/(app)/this-week/page.tsx` (A-004). File: `app/(app)/this-week/page.tsx`.
- **Tasks** (`/tasks`) → `app/(app)/tasks/page.tsx` (A-005). File: `app/(app)/tasks/page.tsx`.
- **Calendar** (`/calendar`) → `app/(app)/calendar/page.tsx` (A-006). File: `app/(app)/calendar/page.tsx`.
- **Calendar event edit/delete placeholders** (`/calendar/events/[eventId]/edit`, `/calendar/events/[eventId]/delete`) → “Coming soon” screens. Files: `app/(app)/calendar/events/[eventId]/edit/page.tsx`, `app/(app)/calendar/events/[eventId]/delete/page.tsx`.
- **Event detail** (`/events/[id]`) → `app/(app)/events/[id]/page.tsx` (A-009). File: `app/(app)/events/[id]/page.tsx`.
- **Announcements** (`/announcements`) → `app/(app)/announcements/page.tsx` (A-008). File: `app/(app)/announcements/page.tsx`.
- **Announcement “new” placeholder** (`/announcements/new`) → “Coming soon” screen, no story in Direction A. File: `app/(app)/announcements/new/page.tsx`.
- **Groups list** (`/groups`) → `app/(app)/groups/page.tsx` (A-007). File: `app/(app)/groups/page.tsx`.
- **Group detail** (`/groups/[groupId]`) → detail view with members + tasks; overlaps A-007/A-013 but no explicit story route. File: `app/(app)/groups/[groupId]/page.tsx`.
- **Digest** (`/digest`) → weekly digest composer; not called out in Direction A stories. File: `app/(app)/digest/page.tsx`.
- **Profile** (`/profile`) → `app/(app)/profile/page.tsx` (A-010). File: `app/(app)/profile/page.tsx`.
- **Style preview** (`/style-preview`) → component showcase; not in Direction A stories. File: `app/(app)/style-preview/page.tsx`.
- **Loading states**: `app/(app)/this-week/loading.tsx`, `app/(app)/tasks/loading.tsx`, `app/(app)/calendar/loading.tsx`.

### Auth routes (`app/(auth)/**`)
- **Sign in** (`/sign-in`) → `app/(auth)/sign-in/page.tsx` (A-012). File: `app/(auth)/sign-in/page.tsx`.
- **Sign up** (`/sign-up`) → `app/(auth)/sign-up/page.tsx` (A-012.5 onboarding surface). File: `app/(auth)/sign-up/page.tsx`.

### API routes (`app/api/**`)
- **NextAuth** (`/api/auth/[...nextauth]`) → `app/api/auth/[...nextauth]/route.ts` (auth backbone). File: `app/api/auth/[...nextauth]/route.ts`.

### App layout & gating
- **App shell + parish setup**: `app/(app)/layout.tsx` renders `ParishSetup` when `activeParishId` is missing. Files: `app/(app)/layout.tsx`, `components/setup/ParishSetup.tsx`.
- **Auth middleware**: `middleware.ts` redirects unauthenticated users to `/sign-in`. File: `middleware.ts`.

## 2) Data & backend inventory

### Prisma schema (core models)
- **Parish, User, Membership**: `prisma/schema.prisma` (roles defined as `ParishRole` enum with ADMIN/SHEPHERD/MEMBER). File: `prisma/schema.prisma`.
- **Group + GroupMembership**: `prisma/schema.prisma` (roles defined as `GroupRole` enum with LEAD/MEMBER). File: `prisma/schema.prisma`.
- **Week, Task, Event, EventRsvp**: `prisma/schema.prisma` (weekly scoping and RSVP storage). File: `prisma/schema.prisma`.
- **Digest, Announcement**: `prisma/schema.prisma`. File: `prisma/schema.prisma`.

### Server actions (`server/actions/**` + `app/actions/**`)
- **Tasks**: `server/actions/tasks.ts`, `server/actions/group-tasks.ts` (create/complete/archive/defer/rollover). Files: `server/actions/tasks.ts`, `server/actions/group-tasks.ts`.
- **Events**: `server/actions/events.ts` (list by week + create), `app/actions/rsvp.ts` (RSVP). Files: `server/actions/events.ts`, `app/actions/rsvp.ts`.
- **Announcements**: `server/actions/announcements.ts` (draft, publish, archive). File: `server/actions/announcements.ts`.
- **Groups**: `server/actions/groups.ts` (create/archive/restore/update membership). File: `server/actions/groups.ts`.
- **Digest**: `server/actions/digest.ts` (draft/publish). File: `server/actions/digest.ts`.
- **Profile**: `app/actions/profile.ts` (notification/digest toggles). File: `app/actions/profile.ts`.
- **Auth & setup**: `server/actions/auth.ts` (sign-up), `server/actions/parish.ts` (create parish). Files: `server/actions/auth.ts`, `server/actions/parish.ts`.

### Queries (`lib/queries/**`)
- **Home**: `lib/queries/home.ts` (home summary + community preview stub). File: `lib/queries/home.ts`.
- **This Week**: `lib/queries/this-week.ts` (tasks + events; announcements array currently empty). File: `lib/queries/this-week.ts`.
- **Tasks**: `lib/queries/tasks.ts` (filters, summary counts, permissions). File: `lib/queries/tasks.ts`.
- **Events**: `lib/queries/events.ts` (calendar event listing + event detail + RSVP response). File: `lib/queries/events.ts`.
- **Announcements**: `lib/queries/announcements.ts`. File: `lib/queries/announcements.ts`.
- **Groups**: `lib/queries/groups.ts`. File: `lib/queries/groups.ts`.
- **Profile**: `lib/queries/profile.ts`. File: `lib/queries/profile.ts`.

### Auth enforcement & permissions
- **Middleware auth gate**: `middleware.ts`.
- **Parish bootstrap + permissions helpers**: `server/auth/bootstrap.ts`, `server/auth/permissions.ts`, `lib/permissions/index.ts`.

## 3) UI inventory (components + patterns)

### UI kit + primitives (A-003)
- Buttons/cards/empty states/dropdowns/tabs/modals/drawers/toasts: `components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/EmptyState.tsx`, `components/ui/Dropdown.tsx`, `components/ui/Tabs.tsx`, `components/ui/Modal.tsx`, `components/ui/Drawer.tsx`, `components/ui/Toast.tsx`.

### Navigation & layout (A-002)
- App shell + sidebar + mobile tabs: `components/navigation/AppShell.tsx`, `components/navigation/Sidebar.tsx`, `components/navigation/MobileTabs.tsx`, `components/navigation/MoreDrawer.tsx`.
- Header actions: `components/header/AppHeader.tsx`.

### Feature modules
- **Home** (A-011): `components/home/home-hero.tsx`, `components/home/community-preview.tsx`, `components/home/quick-actions.tsx`, `components/home/recent-updates.tsx`.
- **This Week** (A-004): `components/this-week/ThisWeekHeader.tsx`, `components/this-week/SectionCard.tsx`, `components/this-week/EmptyStateBlock.tsx`, `components/this-week/ThisWeekSkeleton.tsx`.
- **Tasks** (A-005): `components/tasks/TasksView.tsx`, `components/tasks/TaskRow.tsx`, `components/tasks/TasksList.tsx`, `components/tasks/TaskCreateDialog.tsx`, `components/tasks/TaskFilters.tsx`.
- **Calendar** (A-006): `components/calendar/CalendarView.tsx`, `components/calendar/CalendarGridWeek.tsx`, `components/calendar/CalendarGridMonth.tsx`, `components/calendar/EventDetailPanel.tsx`.
- **Events detail** (A-009): `components/events/EventDetailCard.tsx`, `components/events/RsvpButtons.tsx`.
- **Groups** (A-007): `components/groups/GroupsView.tsx`, `components/groups/GroupCard.tsx`, `components/groups/GroupCreateDialog.tsx`, `components/groups/GroupFilters.tsx`.
- **Announcements** (A-008): `components/announcements/AnnouncementsView.tsx`, `components/announcements/AnnouncementRow.tsx`.
- **Profile** (A-010): `components/profile/ProfileCard.tsx`, `components/profile/ProfileSettings.tsx`.
- **Parish setup (A-012.5)**: `components/setup/ParishSetup.tsx`.

## 4) Tests inventory

### Unit tests
- Nav + UI kit: `tests/unit/nav-sidebar.test.tsx`, `tests/unit/nav-tabs.test.tsx`, `tests/unit/ui-button.test.ts`, `tests/unit/ui-dropdown.test.ts`, `tests/unit/ui-toast.test.ts`, `tests/unit/calendar-toggle.test.tsx`.
- Feature components: `tests/unit/this-week-header.test.tsx`, `tests/unit/task-row.test.tsx`, `tests/unit/group-card.test.tsx`, `tests/unit/announcement-row.test.tsx`, `tests/unit/rsvp-buttons.test.tsx`, `tests/unit/profile-card.test.tsx`, `tests/unit/home-hero.test.tsx`.
- Other utilities: `tests/unit/lib/permissions.test.ts`, `tests/unit/parish-setup.test.ts`, `tests/unit/domain/digest.test.ts`, `tests/unit/style-preview.test.tsx`.

### Integration tests
- Tasks CRUD: `tests/integration/tasks-crud.test.ts`.
- Groups CRUD: `tests/integration/groups-crud.test.ts`.
- Announcements CRUD: `tests/integration/announcements-crud.test.ts`.
- Calendar events: `tests/integration/calendar-events.test.ts`.
- Event RSVP: `tests/integration/event-rsvp.test.ts`.
- Profile settings: `tests/integration/profile-settings.test.ts`.
- Home data: `tests/integration/home-data.test.ts`.

### Notable test gaps vs stories
- A-001 design-tokens test (`tests/unit/design-tokens.test.ts`) is not present.
- A-004 this-week integration test (`tests/integration/this-week-data.test.ts`) is not present.
- A-012 sign-in form unit test (`tests/unit/signin-form.test.tsx`) is not present.
- A-012.5 access-gate unit/integration tests are not present (no `tests/unit/access-gate.test.tsx` or `tests/integration/access-request-flow.test.ts`).
