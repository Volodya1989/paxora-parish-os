"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/Tabs";
import CalendarGridWeek from "@/components/calendar/CalendarGridWeek";
import CalendarGridMonth from "@/components/calendar/CalendarGridMonth";
import CalendarDayList from "@/components/calendar/CalendarDayList";
import EventDetailPanel from "@/components/calendar/EventDetailPanel";
import EventCreateDialog from "@/components/calendar/EventCreateDialog";
import ScheduleView from "@/components/calendar/ScheduleView";
import PageShell from "@/components/app/page-shell";
import FiltersDrawer from "@/components/app/filters-drawer";
import Card from "@/components/ui/Card";
import ListEmptyState from "@/components/app/list-empty-state";
import { CalendarIcon } from "@/components/icons/ParishIcons";
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
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const createParam = searchParams?.get("create");
    if (!createParam) {
      return;
    }

    if (!canCreateEvents) {
      return;
    }

    if (createParam === "event") {
      setCreateType("EVENT");
      setCreateOpen(true);
    } else if (createParam === "service") {
      setCreateType("SERVICE");
      setCreateOpen(true);
    }
  }, [canCreateEvents, searchParams]);

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (params.has("create")) {
        params.delete("create");
        router.replace(`?${params.toString()}`, { scroll: false });
      }
    }
  };

  const addButtonLabel = canCreateEvents ? "+ Add" : "+ Add (restricted)";
  const addButtonTooltip = canCreateEvents
    ? undefined
    : "Only parish leaders or group coordinators can add events.";
  const calendarSectionTitle = view === "week" ? "This week" : "This month";
  const calendarSectionDescription =
    view === "week"
      ? "Review the week at a glance and tap into specific services."
      : "See the full month and spot busy weekends early.";

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

  const scheduleFilters = (
    <div className="space-y-3">
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
          onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}
        >
          <option value="all">All visibility</option>
          <option value="PUBLIC">Public</option>
          <option value="GROUP">Group</option>
          <option value="PRIVATE">Private</option>
        </Select>
      ) : null}
      {viewerGroupIds.length > 0 ? (
        <Select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value as GroupFilter)}>
          <option value="all">All groups</option>
          <option value="mine">My groups</option>
        </Select>
      ) : null}
    </div>
  );

  return (
    <Tabs value={view} onValueChange={(value) => setView(value)}>
      <div className="section-gap">
        <PageShell
          title="Calendar"
          description="Plan services, rehearsals, and gatherings across the parish."
          summaryChips={[
            { label: surface === "schedule" ? "Schedule" : "Calendar", tone: "emerald" },
            { label: view === "week" ? "Week view" : "Month view", tone: "mist" }
          ]}
          actions={
            <>
              <Tabs value={surface} onValueChange={(value) => setSurface(value)}>
                <TabsList aria-label="Calendar surface" className="flex-wrap">
                  <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                </TabsList>
              </Tabs>
              <TabsList aria-label="Calendar view" className="flex-wrap">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
              {surface === "schedule" ? (
                <div className="md:hidden">
                  <FiltersDrawer title="Schedule filters">{scheduleFilters}</FiltersDrawer>
                </div>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                disabled={!canCreateEvents}
                title={addButtonTooltip}
                onClick={() => {
                  setCreateType("SERVICE");
                  setCreateOpen(true);
                }}
                className="h-9 px-3 text-sm"
              >
                {addButtonLabel}
              </Button>
            </>
          }
        >
          {surface === "schedule" ? (
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
              <aside className="hidden lg:block">
                <Card className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                    <CalendarIcon className="h-4 w-4" />
                    Filters
                  </div>
                  {scheduleFilters}
                </Card>
              </aside>
              <div className="space-y-4">
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        Services & events schedule
                      </p>
                      <p className="text-xs text-ink-400">
                        See upcoming services in a calm, day-by-day flow.
                      </p>
                    </div>
                  </div>
                  {!isEditor && viewerGroupIds.length === 0 ? (
                    <div className="mt-3 rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-xs text-ink-500">
                      Showing public events only. Join a ministry group to see their schedules.
                    </div>
                  ) : null}
                  <div className="mt-4">
                    {scheduleEvents.length === 0 ? (
                      <ListEmptyState
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
                </Card>
              </div>
              <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card>
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                  <CalendarIcon className="h-4 w-4" />
                  {calendarSectionTitle}
                </div>
                <p className="mt-2 text-xs text-ink-400">{calendarSectionDescription}</p>
                <TabsPanel value="week" className="mt-4">
                  {weekEvents.length === 0 ? (
                    <ListEmptyState
                      title="No events this week"
                      description="Add a new event to keep the calendar up to date."
                      action={renderEmptyActions()}
                    />
                  ) : (
                    <>
                      <div className="md:hidden">
                        <CalendarDayList
                          days={weekDays}
                          eventsByDay={weekEventsByDay}
                          today={now}
                          onSelectEvent={setSelectedEvent}
                        />
                      </div>
                      <div className="hidden md:block">
                        <CalendarGridWeek
                          days={weekDays}
                          eventsByDay={weekEventsByDay}
                          today={now}
                          selectedEventId={selectedEvent?.instanceId}
                          onSelectEvent={setSelectedEvent}
                        />
                      </div>
                    </>
                  )}
                </TabsPanel>
                <TabsPanel value="month" className="mt-4">
                  {monthEvents.length === 0 ? (
                    <ListEmptyState
                      title="No events this month"
                      description="Schedule something for the parish calendar."
                      action={renderEmptyActions()}
                    />
                  ) : (
                    <>
                      <div className="md:hidden">
                        <CalendarDayList
                          days={monthDays}
                          monthStart={monthRange.start}
                          monthEnd={monthRange.end}
                          eventsByDay={monthEventsByDay}
                          today={now}
                          onSelectEvent={setSelectedEvent}
                        />
                      </div>
                      <div className="hidden md:block">
                        <CalendarGridMonth
                          days={monthDays}
                          monthStart={monthRange.start}
                          monthEnd={monthRange.end}
                          eventsByDay={monthEventsByDay}
                          today={now}
                          selectedEventId={selectedEvent?.instanceId}
                          onSelectEvent={setSelectedEvent}
                        />
                      </div>
                    </>
                  )}
                </TabsPanel>
              </Card>

              <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            </div>
          )}
        </PageShell>
      </div>

      <EventCreateDialog
        open={createOpen}
        onOpenChange={handleCreateOpenChange}
        groupOptions={groupOptions}
        canCreatePublicEvents={canCreatePublicEvents}
        canCreatePrivateEvents={canCreatePrivateEvents}
        canCreateGroupEvents={canCreateGroupEvents}
        defaultType={createType}
      />
    </Tabs>
  );
}
