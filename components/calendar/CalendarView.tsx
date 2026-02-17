"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
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
import HeaderActionBar from "@/components/shared/HeaderActionBar";
import ParishionerAddButton from "@/components/shared/ParishionerAddButton";
import PendingRequestsSection from "@/components/shared/PendingRequestsSection";
import ScheduleView from "@/components/calendar/ScheduleView";
import { Drawer } from "@/components/ui/Drawer";
import Card from "@/components/ui/Card";
import ListEmptyState from "@/components/app/list-empty-state";
import QuoteCard from "@/components/app/QuoteCard";
import { CalendarIcon, ListChecksIcon } from "@/components/icons/ParishIcons";
import {
  getDateKey,
  getMonthGridDays,
  getWeekDays,
  type CalendarRange
} from "@/lib/date/calendar";
import type { CalendarEvent } from "@/lib/queries/events";
import { useTranslations } from "@/lib/i18n/provider";
import type { PendingEventRequest } from "@/lib/queries/eventRequests";
import { approveEventRequest, rejectEventRequest } from "@/server/actions/eventRequests";

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
  canRequestContentCreate?: boolean;
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
  pendingEventRequests,
  canRequestContentCreate = false
}: CalendarViewProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<CalendarViewValue>(initialView);
  const [surface, setSurface] = useState<CalendarSurface>("calendar");
  const [scheduleRange, setScheduleRange] = useState<ScheduleRange>("week");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [createType, setCreateType] = useState<"SERVICE" | "EVENT">("SERVICE");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const hasActiveFilters = visibilityFilter !== "all" || groupFilter !== "all";

  const weekDays = useMemo(() => getWeekDays(weekRange.start), [weekRange.start]);
  const monthDays = useMemo(
    () => getMonthGridDays(monthRange.start, monthRange.end),
    [monthRange.end, monthRange.start]
  );

  // Apply filters to calendar view events
  const applyFilters = (events: CalendarEvent[]) => {
    let filtered = events;

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

    return filtered;
  };

  const filteredWeekEvents = useMemo(
    () => applyFilters(weekEvents),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekEvents, visibilityFilter, groupFilter, viewerGroupIds]
  );

  const filteredMonthEvents = useMemo(
    () => applyFilters(monthEvents),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthEvents, visibilityFilter, groupFilter, viewerGroupIds]
  );

  const weekEventsByDay = useMemo(() => groupEventsByDay(filteredWeekEvents), [filteredWeekEvents]);
  const monthEventsByDay = useMemo(() => groupEventsByDay(filteredMonthEvents), [filteredMonthEvents]);

  const activeEvents = view === "week" ? filteredWeekEvents : filteredMonthEvents;
  const scheduleEvents = useMemo(() => {
    const rangeEvents =
      scheduleRange === "week"
        ? weekEvents
        : scheduleRange === "next"
          ? nextWeekEvents
          : monthEvents;

    return applyFilters(rangeEvents).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {hasActiveFilters ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setVisibilityFilter("all");
            setGroupFilter("all");
          }}
        >
          {t("emptyStates.clearFilters")}
        </Button>
      ) : null}
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
      {canRequestContentCreate ? (
        <ParishionerAddButton
          onClick={() => setRequestOpen(true)}
          ariaLabel={t("calendar.addEvent")}
          className="mx-auto"
        />
      ) : null}
    </div>
  );

  // Shared filter controls used in both filter drawer and schedule sidebar
  const filterControls = (
    <div className="space-y-3">
      {surface === "schedule" ? (
        <Select
          value={scheduleRange}
          onChange={(event) => setScheduleRange(event.target.value as ScheduleRange)}
        >
          <option value="week">{t("calendar.thisWeekRange")}</option>
          <option value="next">{t("calendar.nextWeekRange")}</option>
          <option value="month">{t("calendar.thisMonth")}</option>
        </Select>
      ) : null}
      {isEditor ? (
        <Select
          value={visibilityFilter}
          onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}
        >
          <option value="all">{t("calendar.allVisibility")}</option>
          <option value="PUBLIC">{t("common.public")}</option>
          <option value="GROUP">{t("tasks.filters.group")}</option>
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

  // Whether filters are available (editor or has groups)
  const hasFilterOptions = isEditor || viewerGroupIds.length > 0;

  const pendingRequestItems = useMemo(
    () =>
      pendingEventRequests.map((request) => ({
        id: request.id,
        title: request.title,
        description: request.description ?? undefined,
        meta: `${request.requester.name ?? request.contactName}`
      })),
    [pendingEventRequests]
  );

  const handleRequestDecision = (requestId: string, action: "approve" | "reject") => {
    setActiveRequestId(requestId);
    startTransition(async () => {
      if (action === "approve") {
        await approveEventRequest({ requestId });
      } else {
        await rejectEventRequest({ requestId });
      }
      setActiveRequestId(null);
      router.refresh();
    });
  };

  return (
    <Tabs value={view} onValueChange={(value) => setView(value)}>
      <div className="section-gap">
        <QuoteCard
          quote={t("calendar.quote")}
          source={t("calendar.quoteSource")}
          tone="primary"
        />
        <div className="flex flex-wrap items-center gap-3">
          {surface === "calendar" ? (
            <TabsList aria-label="Time range" className="flex-wrap">
              <TabsTrigger value="week">{t("calendar.week")}</TabsTrigger>
              <TabsTrigger value="month">{t("calendar.month")}</TabsTrigger>
            </TabsList>
          ) : null}
          <div className="flex items-center rounded-full border border-mist-200 bg-white p-0.5 shadow-sm" role="radiogroup" aria-label={t("calendar.viewToggleLabel")}>
            <button
              type="button"
              role="radio"
              aria-checked={surface === "calendar"}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${surface === "calendar" ? "bg-primary-600 text-white shadow-sm" : "text-ink-600 hover:text-ink-900"}`}
              onClick={() => setSurface("calendar")}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {t("calendar.calendarView")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={surface === "schedule"}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${surface === "schedule" ? "bg-primary-600 text-white shadow-sm" : "text-ink-600 hover:text-ink-900"}`}
              onClick={() => setSurface("schedule")}
            >
              <ListChecksIcon className="h-3.5 w-3.5" />
              {t("calendar.scheduleView")}
            </button>
          </div>
        </div>

        {/* Unified header action bar */}
        <HeaderActionBar
          onFilterClick={hasFilterOptions ? () => setFiltersOpen(true) : undefined}
          filterActive={hasActiveFilters}
          onAddClick={
            canCreateEvents || canRequestContentCreate
              ? () => {
                  if (canCreateEvents) {
                    setCreateType("SERVICE");
                    setCreateOpen(true);
                    return;
                  }
                  setRequestOpen(true);
                }
              : undefined
          }
          addLabel={t("calendar.addEvent")}
        />

        {/* Filter drawer (mobile + desktop) */}
        <Drawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t("calendar.filters")}
        >
          {filterControls}
        </Drawer>

        {/* Pending event request approvals — at top for leaders */}
        {pendingEventRequests.length > 0 && (
          <PendingRequestsSection
            entityType="EVENT"
            items={pendingRequestItems}
            canManage={canManageEventRequests}
            busyId={activeRequestId}
            onApprove={(id) => handleRequestDecision(id, "approve")}
            onDecline={(id) => handleRequestDecision(id, "reject")}
          />
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
                  {filterControls}
                </Card>
              </aside>
              <div className="section-gap">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {t("calendar.comingUp")}
                  </p>
                  <p className="text-xs text-ink-400">
                    {t("calendar.comingUpDesc")}
                  </p>
                </div>
                {!isEditor && viewerGroupIds.length === 0 ? (
                  <div className="rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-xs text-ink-500">
                    {t("calendar.publicEventsNote")}
                  </div>
                ) : null}
                <div>
                  {scheduleEvents.length === 0 ? (
                    <ListEmptyState
                      title={t("calendar.emptySchedule")}
                      description={t("calendar.emptyScheduleDesc")}
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
                {filteredWeekEvents.length === 0 ? (
                  <ListEmptyState
                    title={t("calendar.emptyWeek")}
                    description={t("calendar.emptyWeekDesc")}
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
                {filteredMonthEvents.length === 0 ? (
                  <ListEmptyState
                    title={t("calendar.emptyMonth")}
                    description={t("calendar.emptyMonthDesc")}
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
