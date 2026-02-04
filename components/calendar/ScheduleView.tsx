"use client";

import Badge from "@/components/ui/Badge";
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

function formatDaySubtitle(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
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
  SERVICE: "border-l-emerald-300",
  EVENT: "border-l-sky-300"
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

export default function ScheduleView({ events, now, isEditor, onSelectEvent }: ScheduleViewProps) {
  const t = useTranslations();
  const grouped = events.reduce<Record<string, ScheduleEvent[]>>((acc, event) => {
    const key = getDateKey(event.startsAt);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {});

  const dayKeys = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {dayKeys.map((key) => {
        const dayEvents = grouped[key] ?? [];
        const dayDate = dayEvents[0]?.startsAt ?? new Date(key);

        return (
          <section key={key} className="space-y-3">
            {/* Day header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-mist-100 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-700">
                  {formatDayLabel(dayDate, now)}
                </span>
                <span className="text-xs text-ink-400">
                  {formatDaySubtitle(dayDate)}
                </span>
              </div>
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
                    className={`w-full rounded-card border border-mist-200 bg-white p-3 shadow-card text-left transition hover:border-primary-200 hover:bg-primary-50/40 sm:p-4 border-l-4 ${typeAccent[event.type] ?? "border-l-sky-300"}`}
                    onClick={() => onSelectEvent(event)}
                  >
                    <div className="space-y-1.5">
                      {/* Time + badges row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium text-ink-500">
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
                      <p className="text-sm font-semibold text-ink-900">
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
                          <span>{event.location}</span>
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
      })}
    </div>
  );
}
