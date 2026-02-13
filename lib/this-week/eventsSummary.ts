import type { EventPreview } from "@/lib/queries/this-week";
import { PARISH_TIMEZONE } from "@/lib/time/parish";
import { formatTime } from "@/lib/this-week/formatters";
import type { Locale } from "@/lib/i18n/config";

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
  t
}: {
  events: EventPreview[];
  locale: Locale;
  now: Date;
  t: (key: string) => string;
}) {
  const upcoming = [...events]
    .filter((event) => event.startsAt >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  if (upcoming.length === 0) {
    return t("thisWeek.noUpcomingEvents");
  }

  const todayKey = getParishDateKey(now);
  const todayEvent = upcoming.find((event) => getParishDateKey(event.startsAt) === todayKey);

  if (todayEvent) {
    return t("thisWeek.todayAt").replace("{time}", formatTime(todayEvent.startsAt, locale));
  }

  const nextEvent = upcoming[0];
  return t("thisWeek.nextEventAt")
    .replace("{time}", formatTime(nextEvent.startsAt, locale))
    .replace("{day}", formatWeekday(nextEvent.startsAt, locale));
}
