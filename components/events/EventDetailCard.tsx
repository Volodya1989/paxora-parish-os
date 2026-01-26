import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import RsvpButtons from "@/components/events/RsvpButtons";
import { formatRecurrenceSummary } from "@/lib/events/recurrence";
import type { EventDetail } from "@/lib/queries/events";

const PARISH_TZ = process.env.PARISH_TIMEZONE ?? "America/New_York";

function formatDate(startsAt: Date) {
  return startsAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: PARISH_TZ
  });
}

function formatTimeRange(startsAt: Date, endsAt: Date) {
  const startTime = startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: PARISH_TZ
  });
  const endTime = endsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: PARISH_TZ
  });
  return `${startTime} – ${endTime}`;
}


type EventDetailCardProps = {
  event: EventDetail;
};

export default function EventDetailCard({ event }: EventDetailCardProps) {

  const summaryText =
    event.summary.trim().length > 0
      ? event.summary
      : event.type === "SERVICE"
        ? "Service details will be shared closer to the date."
        : "Event details will be shared closer to the date.";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-2xl">{event.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={event.type === "SERVICE" ? "success" : "neutral"}>
                {event.type === "SERVICE" ? "Service" : "Event"}
              </Badge>
              <Badge tone={event.visibility === "PUBLIC" ? "neutral" : "warning"}>
                {event.visibility === "PUBLIC"
                  ? "Public"
                  : event.visibility === "GROUP"
                    ? "Group"
                    : "Private"}
              </Badge>
              {event.group?.name ? <Badge>{event.group.name}</Badge> : null}
            </div>
          </div>
          {event.canManage ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/calendar/events/${event.id}/edit`}>
                <Button type="button" variant="ghost" size="sm">
                  Edit
                </Button>
              </Link>
              <Link href={`/calendar/events/${event.id}/delete`}>
                <Button type="button" variant="danger" size="sm">
                  Delete
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
        <div className="space-y-1 text-sm text-ink-500">
          <p>{formatDate(event.startsAt)}</p>
          <p>{formatTimeRange(event.startsAt, event.endsAt)}</p>
          <p className="text-xs text-ink-400">{formatRecurrenceSummary(event)}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {event.location ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Location</p>
            <p className="text-sm text-ink-700">{event.location}</p>
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Summary</p>
          <p className="text-sm text-ink-700">{summaryText}</p>
        </div>
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
