import { test } from "node:test";
import assert from "node:assert/strict";
import { getThisWeekBadgeDateRanges } from "@/lib/this-week/badgeDateRanges";

test("badge date ranges use rolling now windows and inclusive day-end for +7 days", () => {
  const now = new Date("2026-03-10T15:45:30.500Z");

  const { announcementsStartUtc, eventsStartUtc, eventsEndUtc } = getThisWeekBadgeDateRanges(now);

  assert.equal(announcementsStartUtc.toISOString(), "2026-02-24T15:45:30.500Z");
  assert.equal(eventsStartUtc.toISOString(), "2026-03-10T15:45:30.500Z");
  assert.equal(eventsEndUtc.toISOString(), "2026-03-17T23:59:59.999Z");
});
