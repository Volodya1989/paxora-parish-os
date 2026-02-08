"use client";

import { useState } from "react";
import { MapPinIcon } from "@/components/icons/ParishIcons";
import { getDateKey } from "@/lib/date/calendar";
import type { CalendarEvent } from "@/lib/queries/events";
import { formatTime } from "@/lib/this-week/formatters";

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

const typeAccent: Record<CalendarEvent["type"], string> = {
  SERVICE: "border-t-emerald-300",
  EVENT: "border-t-sky-300"
};

function EventCard({
  event,
  onSelectEvent,
  dimmed
}: {
  event: CalendarEvent;
  onSelectEvent: (event: CalendarEvent) => void;
  dimmed?: boolean;
}) {
  return (
    <button
      key={event.instanceId}
      type="button"
      className={`w-full rounded-card border border-mist-100 bg-white p-3 shadow-card text-left transition hover:border-primary-200 hover:bg-primary-50/40 sm:p-4 border-t-2 ${typeAccent[event.type] ?? "border-t-sky-300"} ${dimmed ? "opacity-60" : ""}`}
      onClick={() => onSelectEvent(event)}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
            {formatTime(event.startsAt)}
          </span>
        </div>

        {/* Title */}
        <p className="text-base font-semibold text-ink-900">
          {event.title}
        </p>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
          {event.location ? (
            <span className="flex items-center gap-1">
              <MapPinIcon className="h-3 w-3 shrink-0" />
              {event.location}
            </span>
          ) : null}
          {event.group?.name ? (
            <span>{event.group.name}</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default function CalendarDayList({
  days,
  eventsByDay,
  today,
  onSelectEvent,
  monthStart,
  monthEnd
}: CalendarDayListProps) {
  const [showPast, setShowPast] = useState(false);
  const todayKey = getDateKey(today);

  const filteredDays = days.filter((day) => {
    if (monthStart && monthEnd && !(day >= monthStart && day < monthEnd)) {
      return false;
    }
    const key = getDateKey(day);
    const events = eventsByDay[key] ?? [];
    return events.length > 0 || key === todayKey;
  });

  const pastDays = filteredDays.filter((day) => getDateKey(day) < todayKey);
  const upcomingDays = filteredDays.filter((day) => getDateKey(day) >= todayKey);

  const pastEventCount = pastDays.reduce((sum, day) => {
    const key = getDateKey(day);
    return sum + (eventsByDay[key]?.length ?? 0);
  }, 0);

  const renderDay = (day: Date, isPast: boolean) => {
    const key = getDateKey(day);
    const events = eventsByDay[key] ?? [];
    const isToday = key === todayKey;

    return (
      <section key={key} className="space-y-3">
        {/* Day header */}
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-mist-100 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-700">
            {formatDayLabel(day, isToday)}
          </span>
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
              <EventCard
                key={event.instanceId}
                event={event}
                onSelectEvent={onSelectEvent}
                dimmed={isPast}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-5">
      {/* Past events toggle */}
      {pastDays.length > 0 && (
        <button
          type="button"
          className="text-xs font-semibold uppercase tracking-wide text-primary-700"
          onClick={() => setShowPast((prev) => !prev)}
        >
          {showPast ? "Hide past events" : "Show past events"} ({pastEventCount})
        </button>
      )}

      {/* Past days (collapsed by default) */}
      {showPast && pastDays.map((day) => renderDay(day, true))}

      {/* Upcoming days (today + future) */}
      {upcomingDays.length > 0 ? (
        upcomingDays.map((day) => renderDay(day, false))
      ) : (
        !showPast && pastDays.length > 0 ? (
          <div className="rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-sm text-ink-500">
            No more events scheduled. Check back next week!
          </div>
        ) : null
      )}
    </div>
  );
}
