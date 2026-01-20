"use client";

import Card from "@/components/ui/Card";
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

function formatDayTitle(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
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
    <div className="space-y-4">
      {filteredDays.map((day) => {
        const key = getDateKey(day);
        const events = eventsByDay[key] ?? [];
        const isToday = key === todayKey;

        return (
          <Card key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {isToday ? "Today" : formatDayTitle(day)}
                </p>
                <p className="text-sm font-semibold text-ink-900">
                  {day.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                  })}
                </p>
              </div>
              <span className="text-xs text-ink-400">{events.length} scheduled</span>
            </div>

            {events.length === 0 ? (
              <div className="rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
                No events scheduled.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <button
                    key={event.instanceId}
                    type="button"
                    className="w-full rounded-card border border-mist-200 bg-white px-3 py-3 text-left shadow-card transition hover:border-primary-200 hover:bg-primary-50/50"
                    onClick={() => onSelectEvent(event)}
                  >
                    <p className="text-sm font-semibold text-ink-900">{event.title}</p>
                    <p className="text-xs text-ink-500">{formatTimeRange(event)}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
