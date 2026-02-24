import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildQuarterHourTimeOptions,
  parseGreetingLocalTime,
  shouldRunGreetingForParishTime
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

test("shouldRunGreetingForParishTime matches exact configured local time", () => {
  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: 9,
      nowMinute: 30,
      sendHourLocal: 9,
      sendMinuteLocal: 30
    }),
    true
  );

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
