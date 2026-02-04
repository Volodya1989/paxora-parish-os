"use client";

import Badge from "@/components/ui/Badge";
import { getDateKey } from "@/lib/date/calendar";
import type { CalendarEvent } from "@/lib/queries/events";

type CalendarDayListProps = {
  days: Date[];
  eventsByDay: Record<string, CalendarEvent[]>;
  today: Date;
  onSelectEvent: (event: CalendarEvent) => void;
  monthStart?: Date;
  monthEnd?: Date;
};

function formatDayLabel(date: Date, isToday: boolean) {
  if (isToday) return "Today";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
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

const typeAccent: Record<CalendarEvent["type"], string> = {
  SERVICE: "border-t-emerald-300",
  EVENT: "border-t-sky-300"
};

export default function CalendarDayList({
  days,
  eventsByDay,
  today,
  onSelectEvent,
  monthStart,
  monthEnd
}: CalendarDayListProps) {
  const todayKey = getDateKey(today);
  const filteredDays = days.filter((day) => {
    if (monthStart && monthEnd && !(day >= monthStart && day < monthEnd)) {
      return false;
    }
    const key = getDateKey(day);
    const events = eventsByDay[key] ?? [];
    return events.length > 0 || key === todayKey;
  });

  return (
    <div className="space-y-5">
      {filteredDays.map((day) => {
        const key = getDateKey(day);
        const events = eventsByDay[key] ?? [];
        const isToday = key === todayKey;

        return (
          <section key={key} className="space-y-3">
            {/* Day header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-mist-100 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-700">
                  {formatDayLabel(day, isToday)}
                </span>
                <span className="text-xs text-ink-400">
                  {formatDaySubtitle(day)}
                </span>
              </div>
              <span className="text-xs text-ink-400">
                {events.length} scheduled
              </span>
            </div>

            {/* Event cards */}
            {events.length === 0 ? (
              <div className="rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-xs text-ink-500">
                No events scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <button
                    key={event.instanceId}
                    type="button"
                    className={`w-full rounded-card border border-mist-200 bg-white p-3 shadow-card text-left transition hover:border-primary-200 hover:bg-primary-50/40 sm:p-4 border-t-2 ${typeAccent[event.type] ?? "border-t-sky-300"}`}
                    onClick={() => onSelectEvent(event)}
                  >
                    <div className="space-y-1.5">
                      {/* Time + type badge row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-ink-500">
                          {formatTimeRange(event)}
                        </span>
                        <Badge
                          tone={event.type === "SERVICE" ? "success" : "neutral"}
                          className={
                            event.type === "SERVICE"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-sky-50 text-sky-700"
                          }
                        >
                          {event.type === "SERVICE" ? "Service" : "Event"}
                        </Badge>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-semibold text-ink-900">
                        {event.title}
                      </p>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                        {event.location ? (
                          <span>{event.location}</span>
                        ) : null}
                        {event.group?.name ? (
                          <span>{event.group.name}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
