import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildQuarterHourTimeOptions,
  parseGreetingLocalTime,
  shouldRunGreetingForParishTime,
  isValidTimezone,
  getParishLocalDateParts
} from "@/lib/email/greetingSchedule";

test("quarter-hour options include 15-minute increments", () => {
  const options = buildQuarterHourTimeOptions();
  assert.equal(options[0]?.value, "00:00");
  assert.equal(options[1]?.value, "00:15");
  assert.equal(options[2]?.value, "00:30");
  assert.equal(options[3]?.value, "00:45");
  assert.equal(options[4]?.value, "01:00");
  assert.equal(options.length, 96);
});

test("parseGreetingLocalTime validates 15-minute boundaries", () => {
  assert.deepEqual(parseGreetingLocalTime("11:15"), { hour: 11, minute: 15 });
  assert.equal(parseGreetingLocalTime("11:10"), null);
  assert.equal(parseGreetingLocalTime("24:00"), null);
});

// --- Window-based matching (15-minute window) ---

test("shouldRunGreetingForParishTime matches at exact configured local time", () => {
  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: 9,
      nowMinute: 0,
      sendHourLocal: 9,
      sendMinuteLocal: 0
    }),
    true
  );
});

test("shouldRunGreetingForParishTime matches 7 minutes after configured time", () => {
  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: 9,
      nowMinute: 7,
      sendHourLocal: 9,
      sendMinuteLocal: 0
    }),
    true
  );
});

test("shouldRunGreetingForParishTime matches at 14 minutes after (boundary)", () => {
  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: 9,
      nowMinute: 14,
      sendHourLocal: 9,
      sendMinuteLocal: 0
    }),
    true
  );
});

test("shouldRunGreetingForParishTime rejects at 15 minutes after (next window)", () => {
  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: 9,
      nowMinute: 15,
      sendHourLocal: 9,
      sendMinuteLocal: 0
    }),
    false
  );
});

test("shouldRunGreetingForParishTime rejects before configured time", () => {
  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: 8,
      nowMinute: 59,
      sendHourLocal: 9,
      sendMinuteLocal: 0
    }),
    false
  );
});

test("shouldRunGreetingForParishTime handles quarter-hour send time with jitter", () => {
  // Configured at 09:30, cron fires at 09:32
  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: 9,
      nowMinute: 32,
      sendHourLocal: 9,
      sendMinuteLocal: 30
    }),
    true
  );
});

test("shouldRunGreetingForParishTime rejects next quarter window", () => {
  // Configured at 09:30, cron fires at 09:45 (next window)
  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: 9,
      nowMinute: 45,
      sendHourLocal: 9,
      sendMinuteLocal: 30
    }),
    false
  );
});

test("shouldRunGreetingForParishTime works across hour boundary within window", () => {
  // Configured at 09:45, current time is 09:58 (13 min after, still in window)
  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: 9,
      nowMinute: 58,
      sendHourLocal: 9,
      sendMinuteLocal: 45
    }),
    true
  );
});

test("shouldRunGreetingForParishTime rejects midnight wrap (next day)", () => {
  // Configured at 23:45, cron fires at 00:05 next day
  // diff = 5 - (23*60+45) = 5 - 1425 = -1420, negative → false
  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: 0,
      nowMinute: 5,
      sendHourLocal: 23,
      sendMinuteLocal: 45
    }),
    false
  );
});

// --- Timezone validation ---

test("isValidTimezone accepts valid IANA timezone", () => {
  assert.equal(isValidTimezone("America/New_York"), true);
  assert.equal(isValidTimezone("Europe/Kyiv"), true);
  assert.equal(isValidTimezone("Pacific/Auckland"), true);
  assert.equal(isValidTimezone("UTC"), true);
});

test("isValidTimezone rejects invalid timezone", () => {
  assert.equal(isValidTimezone("Fake/Zone"), false);
  assert.equal(isValidTimezone("Not_A_Timezone"), false);
  assert.equal(isValidTimezone(""), false);
});

test("getParishLocalDateParts supports legacy UTC offset timezones", () => {
  const now = new Date("2025-01-15T15:45:00.000Z");
  const local = getParishLocalDateParts(now, "UTC-5");

  assert.equal(local.dateKey, "2025-01-15");
  assert.equal(local.hour, 10);
  assert.equal(local.minute, 45);
  assert.equal(local.mode, "legacy-offset");
});
