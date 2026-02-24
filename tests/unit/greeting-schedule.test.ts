import { test } from "node:test";
import assert from "node:assert/strict";
import { getParishLocalDateParts, shouldSendGreetingsThisHour } from "@/lib/email/greetingSchedule";

test("shouldSendGreetingsThisHour matches configured hour", () => {
  assert.equal(shouldSendGreetingsThisHour(9, 9), true);
  assert.equal(shouldSendGreetingsThisHour(8, 9), false);
});

test("shouldSendGreetingsThisHour falls back to 9 for invalid config", () => {
  assert.equal(shouldSendGreetingsThisHour(9, null), true);
  assert.equal(shouldSendGreetingsThisHour(9, 24), true);
  assert.equal(shouldSendGreetingsThisHour(8, 24), false);
});

test("getParishLocalDateParts returns hour and dateKey", () => {
  const parts = getParishLocalDateParts(new Date("2026-01-15T12:30:00.000Z"), "UTC");
  assert.equal(parts.month, 1);
  assert.equal(parts.day, 15);
  assert.equal(parts.hour, 12);
  assert.equal(parts.dateKey, "2026-01-15");
});
