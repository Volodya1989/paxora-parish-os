import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDayDate } from "@/lib/this-week/formatters";

test("formatDayDate uses Ukrainian locale when requested", () => {
  const value = formatDayDate(new Date("2025-02-11T12:00:00Z"), "uk");
  assert.match(value.toLowerCase(), /лют|вт|вів|лют\./);
});

test("formatDayDate defaults to English locale", () => {
  const value = formatDayDate(new Date("2025-02-11T12:00:00Z"));
  assert.match(value, /Feb|Tue/);
});
