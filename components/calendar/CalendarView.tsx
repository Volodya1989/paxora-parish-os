"use client";

import React, { useMemo, useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/Tabs";
import CalendarGridWeek from "@/components/calendar/CalendarGridWeek";
import CalendarGridMonth from "@/components/calendar/CalendarGridMonth";
import EventDetailPanel from "@/components/calendar/EventDetailPanel";
import EventCreateDialog from "@/components/calendar/EventCreateDialog";
import ScheduleView from "@/components/calendar/ScheduleView";
import {
  getDateKey,
  getMonthGridDays,
  getWeekDays,
  type CalendarRange
} from "@/lib/date/calendar";
import type { CalendarEvent } from "@/lib/queries/events";


type CalendarViewProps = {
  weekRange: CalendarRange;
  monthRange: CalendarRange;
  nextWeekRange: CalendarRange;
  weekEvents: CalendarEvent[];
  monthEvents: CalendarEvent[];
  nextWeekEvents: CalendarEvent[];
  now: Date;
  initialView?: "week" | "month";
  canCreateEvents: boolean;
  canCreatePublicEvents: boolean;
  canCreatePrivateEvents: boolean;
  canCreateGroupEvents: boolean;
  isEditor: boolean;
  groupOptions: Array<{ id: string; name: string }>;
  viewerGroupIds: string[];
};

type CalendarViewValue = "week" | "month";
type CalendarSurface = "calendar" | "schedule";
type ScheduleRange = "week" | "next" | "month";
type VisibilityFilter = "all" | "PUBLIC" | "GROUP" | "PRIVATE";
type GroupFilter = "all" | "mine";

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
  nextWeekRange,
  weekEvents,
  monthEvents,
  nextWeekEvents,
  now,
  initialView = "week",
  canCreateEvents,
  canCreatePublicEvents,
  canCreatePrivateEvents,
  canCreateGroupEvents,
  isEditor,
  groupOptions,
  viewerGroupIds
}: CalendarViewProps) {
  const [view, setView] = useState<CalendarViewValue>(initialView);
  const [surface, setSurface] = useState<CalendarSurface>("calendar");
  const [scheduleRange, setScheduleRange] = useState<ScheduleRange>("week");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"SERVICE" | "EVENT">("SERVICE");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekRange.start), [weekRange.start]);
  const monthDays = useMemo(
    () => getMonthGridDays(monthRange.start, monthRange.end),
    [monthRange.end, monthRange.start]
  );

  const weekEventsByDay = useMemo(() => groupEventsByDay(weekEvents), [weekEvents]);
  const monthEventsByDay = useMemo(() => groupEventsByDay(monthEvents), [monthEvents]);

  const activeEvents = view === "week" ? weekEvents : monthEvents;
  const scheduleEvents = useMemo(() => {
    const rangeEvents =
      scheduleRange === "week"
        ? weekEvents
        : scheduleRange === "next"
          ? nextWeekEvents
          : monthEvents;

    let filtered = rangeEvents;

    if (visibilityFilter !== "all") {
      filtered = filtered.filter((event) => event.visibility === visibilityFilter);
    }

    if (groupFilter === "mine" && viewerGroupIds.length > 0) {
      filtered = filtered.filter(
        (event) =>
          event.visibility !== "GROUP" ||
          (event.group?.id ? viewerGroupIds.includes(event.group.id) : false)
      );
    }

    return [...filtered].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, [
    groupFilter,
    monthEvents,
    nextWeekEvents,
    scheduleRange,
    visibilityFilter,
    viewerGroupIds,
    weekEvents
  ]);

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }
    if (!activeEvents.some((event) => event.instanceId === selectedEvent.instanceId)) {
      setSelectedEvent(null);
    }
  }, [activeEvents, selectedEvent]);

  const addButtonLabel = canCreateEvents ? "+ Add" : "+ Add (restricted)";
  const addButtonTooltip = canCreateEvents
    ? undefined
    : "Only parish leaders or group coordinators can add events.";

  const renderEmptyActions = () => (
    <div className="flex flex-wrap justify-center gap-3">
      <Button
        variant="secondary"
        disabled={!canCreateEvents}
        title={addButtonTooltip}
        onClick={() => {
          setCreateType("SERVICE");
          setCreateOpen(true);
        }}
      >
        Add first service
      </Button>
      <Button
        variant="secondary"
        disabled={!canCreateEvents}
        title={addButtonTooltip}
        onClick={() => {
          setCreateType("EVENT");
          setCreateOpen(true);
        }}
      >
        Add event
      </Button>
    </div>
  );

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
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={surface} onValueChange={(value) => setSurface(value)}>
              <TabsList aria-label="Calendar surface">
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>
            </Tabs>
            <TabsList aria-label="Calendar view">
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
            <Button
              type="button"
              variant="secondary"
              disabled={!canCreateEvents}
              title={addButtonTooltip}
              onClick={() => {
                setCreateType("SERVICE");
                setCreateOpen(true);
              }}
            >
              {addButtonLabel}
            </Button>
          </div>
        </div>

        {surface === "schedule" ? (
          <div className="space-y-4">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-h3">Services & events schedule</h3>
                  <p className="text-xs text-ink-400">
                    See upcoming services and gatherings in a calm, day-by-day flow.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={scheduleRange}
                    onChange={(event) => setScheduleRange(event.target.value as ScheduleRange)}
                  >
                    <option value="week">This week</option>
                    <option value="next">Next week</option>
                    <option value="month">This month</option>
                  </Select>
                  {isEditor ? (
                    <Select
                      value={visibilityFilter}
                      onChange={(event) =>
                        setVisibilityFilter(event.target.value as VisibilityFilter)
                      }
                    >
                      <option value="all">All visibility</option>
                      <option value="PUBLIC">Public</option>
                      <option value="GROUP">Group</option>
                      <option value="PRIVATE">Private</option>
                    </Select>
                  ) : null}
                  {viewerGroupIds.length > 0 ? (
                    <Select
                      value={groupFilter}
                      onChange={(event) => setGroupFilter(event.target.value as GroupFilter)}
                    >
                      <option value="all">All groups</option>
                      <option value="mine">My groups</option>
                    </Select>
                  ) : null}
                </div>
              </div>
              {!isEditor && viewerGroupIds.length === 0 ? (
                <div className="rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-xs text-ink-500">
                  Showing public events only. Join a ministry group to see their schedules.
                </div>
              ) : null}
            </Card>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                {scheduleEvents.length === 0 ? (
                  <EmptyState
                    title="No upcoming services yet"
                    description="When you schedule services or events, they will appear here for the parish."
                    action={renderEmptyActions()}
                  />
                ) : (
                  <ScheduleView
                    events={scheduleEvents}
                    now={now}
                    isEditor={isEditor}
                    onSelectEvent={setSelectedEvent}
                  />
                )}
              </div>
              <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="space-y-4">
              <TabsPanel value="week">
                {weekEvents.length === 0 ? (
                  <EmptyState
                    title="No events this week"
                    description="Add a new event to keep the calendar up to date."
                    action={renderEmptyActions()}
                  />
                ) : (
            <CalendarGridWeek
              days={weekDays}
              eventsByDay={weekEventsByDay}
              today={now}
              selectedEventId={selectedEvent?.instanceId}
              onSelectEvent={setSelectedEvent}
            />
          )}
              </TabsPanel>
              <TabsPanel value="month">
                {monthEvents.length === 0 ? (
                  <EmptyState
                    title="No events this month"
                    description="Schedule something for the parish calendar."
                    action={renderEmptyActions()}
                  />
                ) : (
            <CalendarGridMonth
              days={monthDays}
              monthStart={monthRange.start}
              monthEnd={monthRange.end}
              eventsByDay={monthEventsByDay}
              today={now}
              selectedEventId={selectedEvent?.instanceId}
              onSelectEvent={setSelectedEvent}
            />
          )}
              </TabsPanel>
            </Card>

            <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          </div>
        )}
      </div>

      <EventCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        groupOptions={groupOptions}
        canCreatePublicEvents={canCreatePublicEvents}
        canCreatePrivateEvents={canCreatePrivateEvents}
        canCreateGroupEvents={canCreateGroupEvents}
        defaultType={createType}
      />
    </Tabs>
  );
}
