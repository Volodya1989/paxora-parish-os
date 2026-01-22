import Link from "next/link";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CalendarIcon, MapPinIcon } from "@/components/icons/ParishIcons";
import type { EventPreview } from "@/lib/queries/this-week";
import { routes } from "@/lib/navigation/routes";
import { formatTime } from "@/lib/this-week/formatters";
import { cn } from "@/lib/ui/cn";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

type EventsPreviewCardProps = {
  events: EventPreview[];
};

export default function EventsPreviewCard({ events }: EventsPreviewCardProps) {
  if (events.length === 0) {
    return (
      <Card className="border-mist-200 bg-white">
        <CardHeader className="space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Events</CardTitle>
              <span className="text-xs text-ink-400">0 scheduled</span>
            </div>
            <Link href={routes.calendar} className="text-xs font-semibold text-primary-700 underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-mist-200 bg-mist-50/60 px-4 py-8 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mist-100">
              <CalendarIcon className="h-5 w-5 text-ink-400" />
            </div>
            <h3 className="text-sm font-semibold text-ink-900">No events scheduled this week</h3>
            <p className="mt-1.5 max-w-sm text-xs text-ink-500">
              Plan services, rehearsals, and gatherings so everyone stays in sync.
            </p>
            <Link href={`${routes.calendar}?create=event`} className="mt-4">
              <Button className="gap-2">
                <PlusIcon className="h-4 w-4" />
                Add event
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-mist-200 bg-white">
      <CardHeader className="space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Events</CardTitle>
            <span className="text-xs text-ink-400">{events.length} scheduled</span>
          </div>
          <Link href={routes.calendar} className="text-xs font-semibold text-primary-700 underline">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.slice(0, 3).map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
        {events.length > 3 ? (
          <p className="pt-1 text-center text-xs text-ink-500">+{events.length - 3} more events</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: EventPreview }) {
  const dayLabel = event.startsAt.toLocaleDateString("en-US", { weekday: "short" });
  const timeLabel = formatTime(event.startsAt);

  return (
    <div className="group flex items-center justify-between gap-2 rounded-card border border-mist-100 bg-mist-50/60 p-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex shrink-0 flex-col items-center rounded-md bg-primary-50 px-2.5 py-1.5">
          <span className="text-[10px] font-semibold uppercase text-primary-700">{dayLabel}</span>
          <span className="text-[10px] font-medium text-primary-600">{timeLabel}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-ink-900">{event.title}</h4>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-ink-500">
            <MapPinIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{event.location ?? "Location TBA"}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-button text-ink-400 transition hover:bg-mist-100",
          "sm:opacity-0 sm:group-hover:opacity-100"
        )}
        aria-label="Event actions"
      >
        <MoreIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
