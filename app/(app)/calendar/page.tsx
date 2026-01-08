import Card from "@/components/ui/Card";
import ListRow from "@/components/ui/ListRow";
import SectionTitle from "@/components/ui/SectionTitle";
import EventForm from "@/components/shared/EventForm";
import { ScrollToCreate } from "@/components/shared/ScrollToCreate";
import { createEvent, listWeekEvents } from "@/server/actions/events";
import { parseWeekSelection } from "@/domain/week";

function formatDateRange(startsOn: Date, endsOn: Date) {
  const start = startsOn.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  const end = new Date(endsOn.getTime() - 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  return `${start} – ${end}`;
}

function formatDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatEventMeta(event: {
  startsAt: Date;
  endsAt: Date;
  location: string | null;
}) {
  const date = event.startsAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  const startTime = event.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  const endTime = event.endsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  const location = event.location ?? "Location TBA";
  return `${date} · ${startTime}–${endTime} · ${location}`;
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: { week?: string | string[]; create?: string };
}) {
  const weekSelection = parseWeekSelection(searchParams?.week);
  const { week, events, canCreate } = await listWeekEvents(weekSelection);

  const minDateTime = formatDateTimeInput(week.startsOn);
  const maxDateTime = formatDateTimeInput(new Date(week.endsOn.getTime() - 60 * 1000));
  const defaultStart = new Date(week.startsOn);
  defaultStart.setHours(9, 0, 0, 0);
  if (defaultStart < week.startsOn) {
    defaultStart.setTime(week.startsOn.getTime());
  }
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);
  if (defaultEnd > week.endsOn) {
    defaultEnd.setTime(week.endsOn.getTime() - 60 * 1000);
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Calendar"
        subtitle={`${week.label} · ${formatDateRange(week.startsOn, week.endsOn)}`}
      />

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Weekly events</h2>
          <p className="text-sm text-ink-500">{events.length} events</p>
        </div>
        <div className="mt-4">
          {events.length === 0 ? (
            <p className="text-sm text-ink-500">No events listed for this week.</p>
          ) : (
            events.map((event) => (
              <ListRow key={event.id} title={event.title} meta={formatEventMeta(event)} />
            ))
          )}
        </div>
      </Card>

      <Card id="add-event" tabIndex={-1}>
        <ScrollToCreate targetId="add-event" triggerValue="event" />
        <h2 className="text-lg font-semibold text-ink-900">Add an event</h2>
        {canCreate ? (
          <EventForm
            action={createEvent}
            weekId={week.id}
            minDateTime={minDateTime}
            maxDateTime={maxDateTime}
            defaultStartsAt={formatDateTimeInput(defaultStart)}
            defaultEndsAt={formatDateTimeInput(defaultEnd)}
          />
        ) : (
          <p className="mt-3 text-sm text-ink-500">
            You need ADMIN or SHEPHERD access to add events for this week.
          </p>
        )}
      </Card>
    </div>
  );
}
