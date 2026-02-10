import { PARISH_TIMEZONE } from "@/lib/time/parish";

function toDateLocale(locale?: string) {
  return locale === "uk" ? "uk-UA" : "en-US";
}

export function formatDateRange(startsOn: Date, endsOn: Date, locale?: string) {
  const resolvedLocale = toDateLocale(locale);
  const start = startsOn.toLocaleDateString(resolvedLocale, {
    month: "short",
    day: "numeric",
    timeZone: PARISH_TIMEZONE
  });
  const end = new Date(endsOn.getTime() - 1).toLocaleDateString(resolvedLocale, {
    month: "short",
    day: "numeric",
    timeZone: PARISH_TIMEZONE
  });
  return `${start} – ${end}`;
}

export function formatUpdatedLabel(now: Date, locale?: string) {
  const time = now.toLocaleTimeString(toDateLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  });
  return `Updated ${time}`;
}

export function formatEventTime(event: { startsAt: Date }, locale?: string) {
  const resolvedLocale = toDateLocale(locale);
  const date = event.startsAt.toLocaleDateString(resolvedLocale, {
    weekday: "short",
    timeZone: PARISH_TIMEZONE
  });
  const time = event.startsAt.toLocaleTimeString(resolvedLocale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: PARISH_TIMEZONE
  });
  return `${date} ${time}`;
}

export function formatShortDate(date: Date, locale?: string) {
  return date.toLocaleDateString(toDateLocale(locale), {
    month: "short",
    day: "numeric",
    timeZone: PARISH_TIMEZONE
  });
}

export function formatDayDate(date: Date, locale?: string) {
  return date.toLocaleDateString(toDateLocale(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: PARISH_TIMEZONE
  });
}

export function formatTime(date: Date, locale?: string) {
  return date.toLocaleTimeString(toDateLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: PARISH_TIMEZONE
  });
}
