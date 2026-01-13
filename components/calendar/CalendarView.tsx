"use client";

import React, { useMemo, useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/Tabs";
import CalendarGridWeek from "@/components/calendar/CalendarGridWeek";
import CalendarGridMonth from "@/components/calendar/CalendarGridMonth";
import EventDetailPanel from "@/components/calendar/EventDetailPanel";
import {
  getDateKey,
  getMonthGridDays,
  getWeekDays,
  type CalendarRange
} from "@/lib/date/calendar";
import type { CalendarEvent } from "@/lib/queries/events";
import Link from "next/link";

type CalendarViewProps = {
  weekRange: CalendarRange;
  monthRange: CalendarRange;
  weekEvents: CalendarEvent[];
  monthEvents: CalendarEvent[];
  now: Date;
  initialView?: "week" | "month";
};

type CalendarViewValue = "week" | "month";

function groupEventsByDay(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = getDateKey(event.startsAt);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {});
}

export default function CalendarView({
  weekRange,
  monthRange,
  weekEvents,
  monthEvents,
  now,
  initialView = "week"
}: CalendarViewProps) {
  const [view, setView] = useState<CalendarViewValue>(initialView);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekRange.start), [weekRange.start]);
  const monthDays = useMemo(
    () => getMonthGridDays(monthRange.start, monthRange.end),
    [monthRange.end, monthRange.start]
  );

  const weekEventsByDay = useMemo(() => groupEventsByDay(weekEvents), [weekEvents]);
  const monthEventsByDay = useMemo(() => groupEventsByDay(monthEvents), [monthEvents]);

  const activeEvents = view === "week" ? weekEvents : monthEvents;

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }
    if (!activeEvents.some((event) => event.id === selectedEvent.id)) {
      setSelectedEvent(null);
    }
  }, [activeEvents, selectedEvent]);

  return (
    <Tabs value={view} onValueChange={(value) => setView(value)}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-h2">Calendar</h2>
            <p className="text-sm text-ink-500">
              Plan services, rehearsals, and gatherings across the parish.
            </p>
          </div>
          <TabsList aria-label="Calendar view">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="space-y-4">
            <TabsPanel value="week">
              {weekEvents.length === 0 ? (
                <EmptyState
                  title="No events this week"
                  description="Add a new event to keep the calendar up to date."
                  action={
                    <Link
                      href="/calendar?create=event"
                      className="inline-flex items-center justify-center gap-2 rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600 focus-ring"
                    >
                      Add event
                    </Link>
                  }
                />
              ) : (
                <CalendarGridWeek
                  days={weekDays}
                  eventsByDay={weekEventsByDay}
                  today={now}
                  selectedEventId={selectedEvent?.id}
                  onSelectEvent={setSelectedEvent}
                />
              )}
            </TabsPanel>
            <TabsPanel value="month">
              {monthEvents.length === 0 ? (
                <EmptyState
                  title="No events this month"
                  description="Schedule something for the parish calendar."
                  action={
                    <Link
                      href="/calendar?create=event"
                      className="inline-flex items-center justify-center gap-2 rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600 focus-ring"
                    >
                      Add event
                    </Link>
                  }
                />
              ) : (
                <CalendarGridMonth
                  days={monthDays}
                  monthStart={monthRange.start}
                  monthEnd={monthRange.end}
                  eventsByDay={monthEventsByDay}
                  today={now}
                  selectedEventId={selectedEvent?.id}
                  onSelectEvent={setSelectedEvent}
                />
              )}
            </TabsPanel>
          </Card>

          <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </div>
      </div>
    </Tabs>
  );
}
