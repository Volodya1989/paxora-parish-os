import type { EventPreview } from "@/lib/queries/this-week";

export function getUpcomingEventsSnapshot({
  events,
  fallbackEvent,
  now
}: {
  events: EventPreview[];
  fallbackEvent?: EventPreview | null;
  now: Date;
}) {
  const upcomingEvents = [...events]
    .filter((event) => event.startsAt >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  if (
    fallbackEvent &&
    fallbackEvent.startsAt >= now &&
    !upcomingEvents.some((event) => event.id === fallbackEvent.id)
  ) {
    upcomingEvents.push(fallbackEvent);
    upcomingEvents.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  return {
    upcomingEvents,
    upcomingCount: upcomingEvents.length,
    nextUpcomingEvent: upcomingEvents[0] ?? null
  };
}
