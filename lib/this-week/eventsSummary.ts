import type { EventPreview } from "@/lib/queries/this-week";
import { PARISH_TIMEZONE } from "@/lib/time/parish";
import { formatTime } from "@/lib/this-week/formatters";
import type { Locale } from "@/lib/i18n/config";
import { getUpcomingEventsSnapshot } from "@/lib/this-week/upcomingEvents";

function getParishDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARISH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function formatWeekday(date: Date, locale: Locale) {
  const localeTag = locale === "uk" ? "uk-UA" : "en-US";
  return date.toLocaleDateString(localeTag, {
    weekday: "long",
    timeZone: PARISH_TIMEZONE
  });
}

export function buildEventsSummary({
  events,
  locale,
  now,
  t,
  fallbackEvent
}: {
  events: EventPreview[];
  locale: Locale;
  now: Date;
  t: (key: string) => string;
  fallbackEvent?: EventPreview | null;
}) {
  const { upcomingEvents: upcoming, nextUpcomingEvent: nextEvent } = getUpcomingEventsSnapshot({
    events,
    fallbackEvent,
    now
  });

  if (!nextEvent) {
    return t("thisWeek.noUpcomingEvents");
  }

  const todayKey = getParishDateKey(now);
  const todayEvent = upcoming.find((event) => getParishDateKey(event.startsAt) === todayKey)
    ?? (getParishDateKey(nextEvent.startsAt) === todayKey ? nextEvent : null);

  if (todayEvent) {
    return t("thisWeek.todayAt").replace("{time}", formatTime(todayEvent.startsAt, locale));
  }

  return t("thisWeek.nextEventAt")
    .replace("{time}", formatTime(nextEvent.startsAt, locale))
    .replace("{day}", formatWeekday(nextEvent.startsAt, locale));
}
