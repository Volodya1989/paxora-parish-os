"use client";

import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { getDateKey } from "@/lib/date/calendar";
import { formatRecurrenceSummary } from "@/lib/events/recurrence";
import type { CalendarEvent } from "@/lib/queries/events";

const visibilityTone: Record<CalendarEvent["visibility"], "neutral" | "warning"> = {
  PUBLIC: "neutral",
  GROUP: "warning",
  PRIVATE: "warning"
};

function formatDayHeading(date: Date, now: Date) {
  const todayKey = getDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateKey = getDateKey(date);
  if (dateKey === todayKey) {
    return "Today";
  }
  if (dateKey === getDateKey(tomorrow)) {
    return "Tomorrow";
  }
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

function formatDaySubtitle(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatTimeRange(event: CalendarEvent) {
  const startTime = event.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  const endTime = event.endsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${startTime} – ${endTime}`;
}

type ScheduleEvent = CalendarEvent & {
  rsvpYesCount?: number;
};

function formatRecurrence(event: ScheduleEvent) {
  return formatRecurrenceSummary(event);
}

type ScheduleViewProps = {
  events: ScheduleEvent[];
  now: Date;
  isEditor: boolean;
  onSelectEvent: (event: ScheduleEvent) => void;
};

export default function ScheduleView({ events, now, isEditor, onSelectEvent }: ScheduleViewProps) {
  const grouped = events.reduce<Record<string, ScheduleEvent[]>>((acc, event) => {
    const key = getDateKey(event.startsAt);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {});

  const dayKeys = Object.keys(grouped).sort();

  return (
    <div className="space-y-5">
      {dayKeys.map((key) => {
        const dayEvents = grouped[key] ?? [];
        const dayDate = dayEvents[0]?.startsAt ?? new Date(key);

        return (
          <Card key={key} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {formatDayHeading(dayDate, now)}
                </p>
                <h3 className="text-lg font-semibold text-ink-900">
                  {formatDaySubtitle(dayDate)}
                </h3>
              </div>
              <span className="text-xs text-ink-400">{dayEvents.length} scheduled</span>
            </div>

            <div className="space-y-3">
              {dayEvents.map((event) => (
                <button
                  key={event.instanceId}
                  type="button"
                  className="w-full rounded-card border border-mist-200 bg-white px-4 py-3 text-left shadow-card transition hover:border-primary-200 hover:bg-primary-50/50"
                  onClick={() => onSelectEvent(event)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{event.title}</p>
                      <p className="text-xs text-ink-500">{formatTimeRange(event)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={event.type === "SERVICE" ? "success" : "neutral"}>
                        {event.type === "SERVICE" ? "Service" : "Event"}
                      </Badge>
                      {event.recurrenceFreq !== "NONE" ? (
                        <Badge tone="neutral">Repeats</Badge>
                      ) : null}
                      {isEditor ? (
                        <Badge tone={visibilityTone[event.visibility]}>
                          {event.visibility === "PUBLIC"
                            ? "Public"
                            : event.visibility === "GROUP"
                              ? "Group"
                              : "Private"}
                        </Badge>
                      ) : event.visibility !== "PUBLIC" ? (
                        <span
                          className="text-xs text-ink-400"
                          title={
                            event.visibility === "GROUP"
                              ? "Group-only"
                              : "Private to leaders"
                          }
                          aria-label={
                            event.visibility === "GROUP"
                              ? "Group-only"
                              : "Private to leaders"
                          }
                        >
                          ●
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-ink-500">
                    <p>{event.location ?? "Location TBA"}</p>
                    {event.group?.name ? <p>Group: {event.group.name}</p> : null}
                    <p className="text-ink-600">{event.summary}</p>
                    <p className="text-ink-500">{formatRecurrence(event)}</p>
                    <p className="text-ink-500">RSVPs: {event.rsvpYesCount ?? 0}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
