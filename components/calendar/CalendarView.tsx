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

  const renderEmptyActions = () => (
    <div className="flex flex-wrap justify-center gap-3">
      {canCreateEvents ? (
        <Button
          onClick={() => {
            setCreateType("SERVICE");
            setCreateOpen(true);
          }}
        >
          {t("calendar.addService")}
        </Button>
      ) : null}
      {!canManageEventRequests && (
        <Button
          variant={canCreateEvents ? "secondary" : "primary"}
          onClick={() => setRequestOpen(true)}
        >
          {t("calendar.requestEvent")}
        </Button>
      )}
    </div>
  );

  const scheduleFilters = (
    <div className="space-y-3">
      <Select
        value={scheduleRange}
        onChange={(event) => setScheduleRange(event.target.value as ScheduleRange)}
      >
        <option value="week">{t("calendar.thisWeek")}</option>
        <option value="next">{t("calendar.nextWeek")}</option>
        <option value="month">{t("calendar.thisMonth")}</option>
      </Select>
      {isEditor ? (
        <Select
          value={visibilityFilter}
          onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}
        >
          <option value="all">{t("calendar.allVisibility")}</option>
          <option value="PUBLIC">{t("common.public")}</option>
          <option value="GROUP">{t("calendar.group")}</option>
          <option value="PRIVATE">{t("common.private")}</option>
        </Select>
      ) : null}
      {viewerGroupIds.length > 0 ? (
        <Select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value as GroupFilter)}>
          <option value="all">{t("calendar.allGroups")}</option>
          <option value="mine">{t("calendar.myGroups")}</option>
        </Select>
      ) : null}
    </div>
  );

  return (
    <Tabs value={view} onValueChange={(value) => setView(value)}>
      <div className="section-gap">
        <QuoteCard
          quote={t("calendar.quote")}
          source={t("calendar.quoteSource")}
          tone="primary"
        />
        {/* Controls: toggle + actions — single compact row */}
        <div className="flex flex-wrap items-center gap-2">
          <TabsList aria-label={t("calendar.timeRange")} className="flex-wrap">
            <TabsTrigger value="week">{t("calendar.week")}</TabsTrigger>
            <TabsTrigger value="month">{t("calendar.month")}</TabsTrigger>
          </TabsList>
          {surface === "schedule" ? (
            <div className="md:hidden">
              <FiltersDrawer title={t("calendar.scheduleFilters")}>{scheduleFilters}</FiltersDrawer>
            </div>
          ) : null}
          {!canManageEventRequests && (
            <Button
              type="button"
              onClick={() => setRequestOpen(true)}
              className="hidden h-9 px-3 text-sm sm:inline-flex"
            >
              {t("calendar.requestEvent")}
            </Button>
          )}
          {canCreateEvents && (
            <>
              <button
                type="button"
                onClick={() => {
                  setCreateType("SERVICE");
                  setCreateOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 sm:hidden"
                aria-label={t("calendar.addEvent")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              </button>
              <Button
                type="button"
                onClick={() => {
                  setCreateType("SERVICE");
                  setCreateOpen(true);
                }}
                className="hidden h-9 px-3 text-sm sm:inline-flex"
              >
                Add event
              </Button>
            </>
          )}
        </div>

        {/* Pending event request approvals — at top for leaders */}
        {canManageEventRequests && pendingEventRequests.length > 0 && (
          <EventRequestApprovals requests={pendingEventRequests} />
        )}

        <div>
          {surface === "schedule" ? (
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="hidden lg:block">
                <Card className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                    <CalendarIcon className="h-4 w-4" />
                    {t("calendar.filters")}
                  </div>
                  {scheduleFilters}
                </Card>
              </aside>
              <div className="section-gap">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {t("calendar.comingUp")}
                  </p>
                  <p className="text-xs text-ink-400">
                    {t("calendar.dayByDay")}
                  </p>
                </div>
                {!isEditor && viewerGroupIds.length === 0 ? (
                  <div className="rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-xs text-ink-500">
                    {t("calendar.publicEventsOnly")}
                  </div>
                ) : null}
                <div>
                  {scheduleEvents.length === 0 ? (
                    <ListEmptyState
                      title={t("calendar.emptyScheduledTitle")}
                      description={t("calendar.emptyScheduledDescription")}
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
            </div>
          ) : (
            <div className="section-gap">
              <TabsPanel value="week">
                {weekEvents.length === 0 ? (
                  <ListEmptyState
                    title={t("calendar.emptyWeekTitle")}
                    description={t("calendar.emptyWeekDescription")}
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
                    title={t("calendar.emptyMonthTitle")}
                    description={t("calendar.emptyMonthDescription")}
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
          )}
        </div>
      </div>

      <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />

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
