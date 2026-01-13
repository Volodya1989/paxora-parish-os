import Card, { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import RsvpButtons from "@/components/events/RsvpButtons";
import type { EventDetail } from "@/lib/queries/events";

function formatDate(startsAt: Date) {
  return startsAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function formatTimeRange(startsAt: Date, endsAt: Date) {
  const startTime = startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  const endTime = endsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${startTime} – ${endTime}`;
}

type EventDetailCardProps = {
  event: EventDetail;
};

export default function EventDetailCard({ event }: EventDetailCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl">{event.title}</CardTitle>
        <div className="space-y-1 text-sm text-ink-500">
          <p>{formatDate(event.startsAt)}</p>
          <p>{formatTimeRange(event.startsAt, event.endsAt)}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {event.location ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Location</p>
            <p className="text-sm text-ink-700">{event.location}</p>
          </div>
        ) : null}
        {event.summary ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Summary</p>
            <p className="text-sm text-ink-700">{event.summary}</p>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="border-t border-mist-100 pt-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">RSVP</p>
          <RsvpButtons eventId={event.id} initialResponse={event.rsvpResponse} />
        </div>
      </CardFooter>
    </Card>
  );
}
