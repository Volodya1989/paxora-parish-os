import { test } from "node:test";
import assert from "node:assert/strict";
import { getParishLocalDateParts, shouldRunGreetingForParishTime } from "@/lib/email/greetingSchedule";

test("greetings scheduler resolves America/New_York local time across DST boundary", () => {
  const beforeDst = new Date("2025-03-09T06:30:00.000Z"); // 01:30 EST
  const afterDst = new Date("2025-03-09T07:30:00.000Z"); // 03:30 EDT

  const before = getParishLocalDateParts(beforeDst, "America/New_York");
  const after = getParishLocalDateParts(afterDst, "America/New_York");

  assert.equal(before.dateKey, "2025-03-09");
  assert.equal(before.hour, 1);
  assert.equal(before.minute, 30);

  assert.equal(after.dateKey, "2025-03-09");
  assert.equal(after.hour, 3);
  assert.equal(after.minute, 30);

  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: before.hour,
      nowMinute: before.minute,
      sendHourLocal: 1,
      sendMinuteLocal: 30
    }),
    true
  );

  assert.equal(
    shouldRunGreetingForParishTime({
      nowHour: after.hour,
      nowMinute: after.minute,
      sendHourLocal: 1,
      sendMinuteLocal: 30
    }),
    false
  );
});
