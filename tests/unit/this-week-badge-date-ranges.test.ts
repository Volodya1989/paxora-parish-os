import { test } from "node:test";
import assert from "node:assert/strict";
import { getThisWeekBadgeDateRanges } from "@/lib/this-week/badgeDateRanges";

test("badge date ranges use rolling 14-day announcement window from now", () => {
  const now = new Date("2026-03-10T15:45:30.500Z");

  const { announcementsStartUtc } = getThisWeekBadgeDateRanges(now);

  assert.equal(announcementsStartUtc.toISOString(), "2026-02-24T15:45:30.500Z");
});
