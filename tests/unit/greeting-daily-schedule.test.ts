import { test } from "node:test";
import assert from "node:assert/strict";
import { getDailyGreetingScheduleStatus, getParishLocalDateParts } from "@/lib/email/greetingSchedule";

test("getParishLocalDateParts keeps local dateKey stable across New York DST jump", () => {
  const beforeDst = new Date("2025-03-09T06:30:00.000Z");
  const afterDst = new Date("2025-03-09T07:30:00.000Z");

  const before = getParishLocalDateParts(beforeDst, "America/New_York");
  const after = getParishLocalDateParts(afterDst, "America/New_York");

  assert.equal(before.dateKey, "2025-03-09");
  assert.equal(after.dateKey, "2025-03-09");
});

test("daily schedule shows tomorrow once greetings already sent today", () => {
  const status = getDailyGreetingScheduleStatus({
    nowUtc: new Date("2026-01-10T21:05:00.000Z"),
    timezone: "America/New_York",
    sendHourLocal: 15,
    sendMinuteLocal: 0,
    sentToday: true
  });

  assert.equal(status.nextRunLabel, "Tomorrow at 3:00 PM (best-effort, daily job)");
});

test("daily schedule shows today when not sent yet", () => {
  const status = getDailyGreetingScheduleStatus({
    nowUtc: new Date("2026-01-10T19:56:00.000Z"),
    timezone: "America/New_York",
    sendHourLocal: 15,
    sendMinuteLocal: 0,
    sentToday: false
  });

  assert.equal(status.nextRunLabel, "Today (best-effort during daily job)");
});
