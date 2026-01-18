export function formatDateRange(startsOn: Date, endsOn: Date) {
  const start = startsOn.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  const end = new Date(endsOn.getTime() - 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  return `${start} – ${end}`;
}

export function formatUpdatedLabel(now: Date) {
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  });
  return `Updated ${time}`;
}

export function formatEventTime(event: { startsAt: Date }) {
  const date = event.startsAt.toLocaleDateString("en-US", {
    weekday: "short"
  });
  const time = event.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${date} ${time}`;
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

export function formatDayDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}
