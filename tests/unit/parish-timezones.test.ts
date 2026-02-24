import { test } from "node:test";
import assert from "node:assert/strict";
import { getNextRunPreview } from "@/lib/time/parishTimezones";

test("getNextRunPreview returns same-day run when send time is later in parish local time", () => {
  const nowUtc = new Date("2026-01-10T19:56:00.000Z"); // 2:56 PM in New York (EST)
  const preview = getNextRunPreview("America/New_York", "15:00", nowUtc);
  assert.equal(preview, "Today at 3:00 PM");
});

test("getNextRunPreview returns tomorrow when send time already passed in parish local time", () => {
  const nowUtc = new Date("2026-01-10T21:05:00.000Z"); // 4:05 PM in New York (EST)
  const preview = getNextRunPreview("America/New_York", "15:00", nowUtc);
  assert.equal(preview, "Tomorrow at 3:00 PM");
});

test("getNextRunPreview handles legacy UTC offsets", () => {
  const nowUtc = new Date("2026-01-10T19:56:00.000Z"); // 14:56 in UTC-5
  const preview = getNextRunPreview("UTC-5", "15:00", nowUtc);
  assert.equal(preview, "Today at 3:00 PM");
});
