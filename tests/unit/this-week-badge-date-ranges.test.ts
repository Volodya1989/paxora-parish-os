import { test } from "node:test";
import assert from "node:assert/strict";
import { getThisWeekBadgeDateRanges } from "@/lib/this-week/badgeDateRanges";

test("badge date ranges use rolling now windows and current-week end boundary", () => {
  const now = new Date("2026-03-10T15:45:30.500Z");
  const weekEndsOn = new Date("2026-03-16T00:00:00.000Z");

  const { announcementsStartUtc, eventsStartUtc, eventsEndExclusive } = getThisWeekBadgeDateRanges({
    now,
    weekEndsOn
  });

  assert.equal(announcementsStartUtc.toISOString(), "2026-02-24T15:45:30.500Z");
  assert.equal(eventsStartUtc.toISOString(), "2026-03-10T15:45:30.500Z");
  assert.equal(eventsEndExclusive.toISOString(), "2026-03-16T00:00:00.000Z");
});
