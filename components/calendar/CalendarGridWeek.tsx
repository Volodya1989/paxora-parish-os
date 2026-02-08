"use client";

import React from "react";
import { cn } from "@/lib/ui/cn";
import { getDateKey } from "@/lib/date/calendar";
import { formatRecurrenceSummary } from "@/lib/events/recurrence";
import type { CalendarEvent } from "@/lib/queries/events";
import EventChip from "@/components/calendar/EventChip";
import { formatTime } from "@/lib/this-week/formatters";

type CalendarGridWeekProps = {
  days: Date[];
  eventsByDay: Record<string, CalendarEvent[]>;
  today: Date;
  selectedEventId?: string | null;
  onSelectEvent: (event: CalendarEvent) => void;
};

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarGridWeek({
  days,
  eventsByDay,
  today,
  selectedEventId,
  onSelectEvent
}: CalendarGridWeekProps) {
  const todayKey = getDateKey(today);

  const dayEntries = days.map((day, index) => ({
    day,
    label: dayNames[index] ?? day.toLocaleDateString("en-US", { weekday: "short" })
  }));
  const paddedEntries: Array<{ day: Date; label: string } | null> = [...dayEntries];
  while (paddedEntries.length % 4 !== 0) {
    paddedEntries.push(null);
  }

  return (
    <div data-testid="calendar-week-grid" className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {paddedEntries.map((entry, index) => {
          if (!entry) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[160px] rounded-card border border-dashed border-mist-100 bg-mist-50/40"
              />
            );
          }

          const { day, label } = entry;
          const key = getDateKey(day);
          const isToday = key === todayKey;
          const events = eventsByDay[key] ?? [];

          return (
            <div
              key={key}
              className={cn(
                "min-h-[160px] rounded-card bg-white/90 p-4 ring-1 ring-mist-100/70",
                isToday && "bg-emerald-50/40 ring-emerald-200"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {label}
                  </p>
                  <p
                    className={cn(
                      "text-base font-semibold text-ink-700",
                      isToday && "text-emerald-700"
                    )}
                  >
                    {day.getDate()}
                  </p>
                </div>
                {isToday ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Today
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                {events.map((event) => (
                  <EventChip
                    key={event.instanceId}
                    title={event.title}
                    timeLabel={formatTime(event.startsAt)}
                    isSelected={selectedEventId === event.instanceId}
                    ariaLabel={`${event.title} on ${event.startsAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    })}`}
                    recurrenceLabel={
                      event.recurrenceFreq !== "NONE"
                        ? formatRecurrenceSummary(event)
                        : undefined
                    }
                    onClick={() => onSelectEvent(event)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
