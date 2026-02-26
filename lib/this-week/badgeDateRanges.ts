export function getThisWeekBadgeDateRanges({ now, weekEndsOn }: { now: Date; weekEndsOn: Date }) {
  const announcementsStartUtc = new Date(now);
  announcementsStartUtc.setUTCDate(announcementsStartUtc.getUTCDate() - 14);

  return {
    announcementsStartUtc,
    eventsStartUtc: now,
    eventsEndExclusive: weekEndsOn
  };
}
