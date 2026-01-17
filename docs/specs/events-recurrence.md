# Calendar recurrence (A-013 addendum)

## Phase 0 findings
- Event model had no recurrence fields; only single start/end time, visibility, group, and type.【F:prisma/schema.prisma†L119-L154】
- Event actions accepted date/time only; no recurrence validation existed.【F:server/actions/events.ts†L98-L210】【F:lib/validation/events.ts†L30-L47】
- Schedule UI had placeholders for recurrence but no data wiring (since addressed below).

## Implemented backend delta
Added recurrence fields on `Event`:
- `recurrenceFreq`: `NONE` | `DAILY` | `WEEKLY` (default `NONE`)
- `recurrenceInterval`: integer, default `1`
- `recurrenceByWeekday`: `Int[]` (0=Sun…6=Sat)
- `recurrenceUntil`: nullable `DateTime`

## Expansion strategy
- Recurring events are expanded inside `listEventsByRange` only for the requested window (week/month/schedule).
- Daily: every `interval` days from the event start date.
- Weekly: every `interval` weeks, using `recurrenceByWeekday` (fallback to start date weekday if empty).
- Expansion respects `recurrenceUntil` if set.

## UI updates
- Event create/edit form includes:
  - “Repeats” dropdown: Does not repeat / Daily / Weekly / Custom weekdays
  - Weekday toggles for Weekly or Custom
  - “Ends” control: Never / On date
- Recurrence indicators display in calendar chips, schedule list, and event detail panels.

## Tests
- Integration test added: weekly recurring event appears on selected weekdays in week view.
