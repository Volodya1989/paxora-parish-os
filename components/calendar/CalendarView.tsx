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
import EventRequestDialog from "@/components/shared/EventRequestDialog";
import ScheduleView from "@/components/calendar/ScheduleView";
import EventRequestApprovals from "@/components/calendar/EventRequestApprovals";
import PageShell from "@/components/app/page-shell";
import FiltersDrawer from "@/components/app/filters-drawer";
import Card from "@/components/ui/Card";
import ListEmptyState from "@/components/app/list-empty-state";
import QuoteCard from "@/components/app/QuoteCard";
import { CalendarIcon } from "@/components/icons/ParishIcons";
import {
  getDateKey,
  getMonthGridDays,
  getWeekDays,
  type CalendarRange
} from "@/lib/date/calendar";
import type { CalendarEvent } from "@/lib/queries/events";
import { useTranslations } from "@/lib/i18n/provider";
import type { PendingEventRequest } from "@/lib/queries/eventRequests";

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
  canManageEventRequests: boolean;
  groupOptions: Array<{ id: string; name: string }>;
  viewerGroupIds: string[];
  pendingEventRequests: PendingEventRequest[];
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
  canManageEventRequests,
  groupOptions,
  viewerGroupIds,
  pendingEventRequests
}: CalendarViewProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<CalendarViewValue>(initialView);
  const [surface, setSurface] = useState<CalendarSurface>("calendar");
  const [scheduleRange, setScheduleRange] = useState<ScheduleRange>("week");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"SERVICE" | "EVENT">("SERVICE");
  const [requestOpen, setRequestOpen] = useState(false);
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

  const calendarSectionTitle = view === "week" ? "This week" : "This month";

  const renderEmptyActions = () => (
    <div className="flex flex-wrap justify-center gap-3">
      {canCreateEvents ? (
        <Button
          onClick={() => {
            setCreateType("SERVICE");
            setCreateOpen(true);
          }}
        >
          Add a service
        </Button>
      ) : null}
      <Button
        variant={canCreateEvents ? "secondary" : "primary"}
        onClick={() => setRequestOpen(true)}
      >
        Request an event
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
          <option value="PUBLIC">{t("common.public")}</option>
          <option value="GROUP">Group</option>
          <option value="PRIVATE">{t("common.private")}</option>
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
        <QuoteCard
          quote="For everything there is a season, and a time for every matter under heaven."
          source="Ecclesiastes 3:1"
          tone="primary"
        />
        <PageShell
          title="Upcoming Events"
          summaryChips={[
            { label: view === "week" ? "This week" : "This month", tone: "mist" }
          ]}
          actions={
            <>
              <TabsList aria-label="Time range" className="flex-wrap">
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
                onClick={() => setRequestOpen(true)}
                className="h-9 px-3 text-sm"
              >
                Request an event
              </Button>
              {canCreateEvents ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCreateType("SERVICE");
                    setCreateOpen(true);
                  }}
                  className="h-9 px-3 text-sm"
                >
                  + Add
                </Button>
              ) : null}
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
              <div className="section-gap">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    Coming up
                  </p>
                  <p className="text-xs text-ink-400">
                    Services and events, day by day.
                  </p>
                </div>
                {!isEditor && viewerGroupIds.length === 0 ? (
                  <div className="rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-xs text-ink-500">
                    Showing public events. Join a group to see their schedules too.
                  </div>
                ) : null}
                <div>
                  {scheduleEvents.length === 0 ? (
                    <ListEmptyState
                      title="Nothing scheduled yet"
                      description="New services and events will show up here as they're added."
                      icon={<CalendarIcon className="h-6 w-6" />}
                      action={renderEmptyActions()}
                      variant="friendly"
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
              </div>
              <div className="space-y-4">
                <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                {canManageEventRequests ? (
                  <EventRequestApprovals requests={pendingEventRequests} />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="section-gap">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                  <CalendarIcon className="h-4 w-4" />
                  {calendarSectionTitle}
                </div>
                <TabsPanel value="week">
                  {weekEvents.length === 0 ? (
                    <ListEmptyState
                      title="A quiet week ahead"
                      description="No services or events are scheduled this week. Check back soon!"
                      icon={<CalendarIcon className="h-6 w-6" />}
                      action={renderEmptyActions()}
                      variant="friendly"
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
                <TabsPanel value="month">
                  {monthEvents.length === 0 ? (
                    <ListEmptyState
                      title="Nothing on the calendar this month"
                      description="Events and services will appear here once they're scheduled."
                      icon={<CalendarIcon className="h-6 w-6" />}
                      action={renderEmptyActions()}
                      variant="friendly"
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
              </div>

              <div className="space-y-4">
                <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                {canManageEventRequests ? (
                  <EventRequestApprovals requests={pendingEventRequests} />
                ) : null}
              </div>
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
      <EventRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
      />
    </Tabs>
  );
}
