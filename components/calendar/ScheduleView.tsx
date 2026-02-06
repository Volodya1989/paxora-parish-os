"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { MapPinIcon } from "@/components/icons/ParishIcons";
import { getDateKey } from "@/lib/date/calendar";
import { formatRecurrenceSummary } from "@/lib/events/recurrence";
import type { CalendarEvent } from "@/lib/queries/events";
import { useTranslations } from "@/lib/i18n/provider";

const visibilityTone: Record<CalendarEvent["visibility"], "neutral" | "warning"> = {
  PUBLIC: "neutral",
  GROUP: "warning",
  PRIVATE: "warning"
};

function formatDayLabel(date: Date, now: Date) {
  const todayKey = getDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateKey = getDateKey(date);
  if (dateKey === todayKey) return "Today";
  if (dateKey === getDateKey(tomorrow)) return "Tomorrow";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
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

const typeAccent: Record<CalendarEvent["type"], string> = {
  SERVICE: "border-t-emerald-300",
  EVENT: "border-t-sky-300"
};

type ScheduleEvent = CalendarEvent & {
  rsvpTotalCount?: number;
};

function formatRecurrence(event: ScheduleEvent) {
  return formatRecurrenceSummary(event);
}

type ScheduleViewProps = {
  events: ScheduleEvent[];
  now: Date;
  isEditor: boolean;
  onSelectEvent: (event: ScheduleEvent) => void;
};

function ScheduleDaySection({
  dayKey,
  dayEvents,
  now,
  isEditor,
  onSelectEvent,
  dimmed,
  t
}: {
  dayKey: string;
  dayEvents: ScheduleEvent[];
  now: Date;
  isEditor: boolean;
  onSelectEvent: (event: ScheduleEvent) => void;
  dimmed: boolean;
  t: (key: string) => string;
}) {
  const dayDate = dayEvents[0]?.startsAt ?? new Date(dayKey);

  return (
    <section key={dayKey} className={`space-y-3 ${dimmed ? "opacity-60" : ""}`}>
      {/* Day header */}
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-mist-100 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-700">
          {formatDayLabel(dayDate, now)}
        </span>
        <span className="text-xs text-ink-400">
          {dayEvents.length} scheduled
        </span>
      </div>

      {/* Event cards */}
      <div className="space-y-3">
        {dayEvents.map((event) => {
          const recurrenceLabel = formatRecurrence(event);

          return (
            <button
              key={event.instanceId}
              type="button"
              className={`w-full rounded-card border border-mist-200 bg-white p-3 shadow-card text-left transition hover:border-primary-200 hover:bg-primary-50/40 sm:p-4 border-t-2 ${typeAccent[event.type] ?? "border-t-sky-300"}`}
              onClick={() => onSelectEvent(event)}
            >
              <div className="space-y-1.5">
                {/* Time + badges row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink-600">
                    {formatTimeRange(event)}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      tone={event.type === "SERVICE" ? "success" : "neutral"}
                      className={
                        event.type === "SERVICE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-sky-50 text-sky-700"
                      }
                    >
                      {event.type === "SERVICE" ? "Service" : "Event"}
                    </Badge>
                    {event.recurrenceFreq !== "NONE" ? (
                      <Badge tone="neutral">Repeats</Badge>
                    ) : null}
                    {isEditor ? (
                      <Badge tone={visibilityTone[event.visibility]}>
                        {event.visibility === "PUBLIC"
                          ? t("common.public")
                          : event.visibility === "GROUP"
                            ? "Group"
                            : t("common.private")}
                      </Badge>
                    ) : event.visibility !== "PUBLIC" ? (
                      <span
                        className="text-xs text-ink-400"
                        title={
                          event.visibility === "GROUP"
                            ? "Group-only"
                            : "Private to leaders"
                        }
                        aria-label={
                          event.visibility === "GROUP"
                            ? "Group-only"
                            : "Private to leaders"
                        }
                      >
                        ●
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Title */}
                <p className="text-base font-semibold text-ink-900">
                  {event.title}
                </p>

                {/* Summary (if available) */}
                {event.summary ? (
                  <p className="text-xs leading-relaxed text-ink-500 line-clamp-2">
                    {event.summary}
                  </p>
                ) : null}

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
                  {recurrenceLabel ? (
                    <span>{recurrenceLabel}</span>
                  ) : null}
                  {(event.rsvpTotalCount ?? 0) > 0 ? (
                    <span>
                      {event.rsvpTotalCount} {event.rsvpTotalCount === 1 ? "RSVP" : "RSVPs"}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function ScheduleView({ events, now, isEditor, onSelectEvent }: ScheduleViewProps) {
  const t = useTranslations();
  const [showPast, setShowPast] = useState(false);
  const todayKey = getDateKey(now);

  const grouped = events.reduce<Record<string, ScheduleEvent[]>>((acc, event) => {
    const key = getDateKey(event.startsAt);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {});

  const dayKeys = Object.keys(grouped).sort();
  const pastKeys = dayKeys.filter((key) => key < todayKey);
  const upcomingKeys = dayKeys.filter((key) => key >= todayKey);

  const pastEventCount = pastKeys.reduce(
    (sum, key) => sum + (grouped[key]?.length ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Past events toggle */}
      {pastKeys.length > 0 && (
        <button
          type="button"
          className="text-xs font-semibold uppercase tracking-wide text-primary-700"
          onClick={() => setShowPast((prev) => !prev)}
        >
          {showPast ? "Hide past events" : "Show past events"} ({pastEventCount})
        </button>
      )}

      {/* Past days (collapsed by default) */}
      {showPast &&
        pastKeys.map((key) => (
          <ScheduleDaySection
            key={key}
            dayKey={key}
            dayEvents={grouped[key] ?? []}
            now={now}
            isEditor={isEditor}
            onSelectEvent={onSelectEvent}
            dimmed
            t={t}
          />
        ))}

      {/* Upcoming days (today + future) */}
      {upcomingKeys.length > 0 ? (
        upcomingKeys.map((key) => (
          <ScheduleDaySection
            key={key}
            dayKey={key}
            dayEvents={grouped[key] ?? []}
            now={now}
            isEditor={isEditor}
            onSelectEvent={onSelectEvent}
            dimmed={false}
            t={t}
          />
        ))
      ) : (
        !showPast && pastKeys.length > 0 ? (
          <div className="rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-sm text-ink-500">
            No more events scheduled. Check back next week!
          </div>
        ) : null
      )}
    </div>
  );
}
