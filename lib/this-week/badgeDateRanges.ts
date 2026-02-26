export function getUtcStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getUtcEndOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

export function getThisWeekBadgeDateRanges(now: Date) {
  const todayStartUtc = getUtcStartOfDay(now);

  const announcementsStartUtc = new Date(now);
  announcementsStartUtc.setUTCDate(announcementsStartUtc.getUTCDate() - 14);

  const eventsEndUtc = new Date(todayStartUtc);
  eventsEndUtc.setUTCDate(eventsEndUtc.getUTCDate() + 7);

  return {
    announcementsStartUtc,
    eventsStartUtc: now,
    eventsEndUtc: getUtcEndOfDay(eventsEndUtc)
  };
}
