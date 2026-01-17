# Calendar gaps — Findings + plan

## Findings
- **UI surfaces**: The calendar currently ships a week/month grid with event chips and a read-only detail panel in `components/calendar/*` and `app/(app)/calendar/page.tsx`.
- **CRUD**: The “Add event” CTA is disabled in `components/calendar/CalendarView.tsx`. Edit/Delete routes are placeholders in `app/(app)/calendar/events/[eventId]/*`.
- **Event data**: `lib/queries/events.ts` returns `summary: null` for list views, and event records have no visibility or grouping model yet.
- **Permissions**: `server/actions/events.ts` checks for parish role on create but there is no UI affordance or visibility enforcement in list queries.

## Plan
- Add a **Schedule** list view alongside the existing week/month grid, with day grouping, visibility badges for editors, and pastoral empty states.
- Introduce an event **visibility model** (`PUBLIC | GROUP | PRIVATE`) plus optional `groupId` and `type` (`SERVICE | EVENT`) so services can be surfaced with tags.
- Update **list queries** to return a non-null summary and filter events by viewer visibility + group membership.
- Implement **CRUD**:
  - Create: modal/drawer from Calendar view.
  - Edit/Delete: replace placeholder routes with working flows.
  - Detail panel: add RSVP CTA and editor actions.
- Keep server-side **permission enforcement** (parish leader vs group member) and mirror with UI affordances.

## Files scoped for work
- `components/calendar/*`
- `app/(app)/calendar/*`
- `app/(app)/events/[id]/page.tsx`
- `lib/queries/events.ts`
- `server/actions/events.ts`
- `prisma/schema.prisma`
