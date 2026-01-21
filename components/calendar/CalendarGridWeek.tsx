"use client";

import React from "react";
import { cn } from "@/lib/ui/cn";
import { getDateKey } from "@/lib/date/calendar";
import { formatRecurrenceSummary } from "@/lib/events/recurrence";
import type { CalendarEvent } from "@/lib/queries/events";
import EventChip from "@/components/calendar/EventChip";

type CalendarGridWeekProps = {
  days: Date[];
  eventsByDay: Record<string, CalendarEvent[]>;
  today: Date;
  selectedEventId?: string | null;
  onSelectEvent: (event: CalendarEvent) => void;
};

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatChipTime(startsAt: Date) {
  return startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function CalendarGridWeek({
  days,
  eventsByDay,
  today,
  selectedEventId,
  onSelectEvent
}: CalendarGridWeekProps) {
  const todayKey = getDateKey(today);

  return (
    <div data-testid="calendar-week-grid" className="space-y-3">
      <div className="grid grid-cols-7 gap-3 text-xs uppercase tracking-wide text-ink-400">
        {dayNames.map((day) => (
          <div key={day} className="text-center">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => {
          const key = getDateKey(day);
          const isToday = key === todayKey;
          const events = eventsByDay[key] ?? [];

          return (
            <div
              key={key}
              className={cn(
                "min-h-[140px] rounded-card border border-mist-100 bg-white p-3",
                isToday && "border-emerald-300 bg-emerald-50/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-sm font-semibold text-ink-700",
                    isToday && "text-emerald-700"
                  )}
                >
                  {day.getDate()}
                </span>
                {isToday ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Today
                  </span>
                ) : null}
              </div>
              <div className="mt-2 space-y-2">
                {events.map((event) => (
                  <EventChip
                    key={event.instanceId}
                    title={event.title}
                    timeLabel={formatChipTime(event.startsAt)}
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
