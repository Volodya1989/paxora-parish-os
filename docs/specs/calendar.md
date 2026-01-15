# Calendar — Status + Notes

## Status
- **Current implementation:** Week/month calendar views with event chips and a detail panel; event detail page exists with RSVP. Routes and components include `app/(app)/calendar/page.tsx`, `components/calendar/CalendarView.tsx`, `components/calendar/CalendarGridWeek.tsx`, `components/calendar/CalendarGridMonth.tsx`, and `components/calendar/EventDetailPanel.tsx`. Event detail page and RSVP live in `app/(app)/events/[id]/page.tsx`, `components/events/EventDetailCard.tsx`, and `app/actions/rsvp.ts`.

## Notes / Gaps
- **Detail panel CTA:** The calendar panel is read-only and only links to “View details,” with no RSVP CTA on the panel itself (`components/calendar/EventDetailPanel.tsx`).
- **Event CRUD:** Edit/delete pages are placeholders, and the calendar UI does not expose creation (the “Add event” button is disabled in `components/calendar/CalendarView.tsx`). Placeholder pages live in `app/(app)/calendar/events/[eventId]/edit/page.tsx` and `app/(app)/calendar/events/[eventId]/delete/page.tsx`.
- **Summary data in grids:** Calendar list queries return `summary: null` for list events, so month/week grids cannot render richer summaries (`lib/queries/events.ts`).

## Dependencies for later stories
- **A-013+ permissions:** Event creation/editing is currently limited to server-side role checks in `server/actions/events.ts`, but UI does not yet reflect or enforce per-role affordances.
- **A-014+ chat:** No direct dependency.
