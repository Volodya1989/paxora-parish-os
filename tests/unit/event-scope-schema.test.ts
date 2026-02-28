import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteEventSchema, updateEventSchema } from "@/lib/validation/events";

test("updateEventSchema defaults scope when null is provided", () => {
  const parsed = updateEventSchema.safeParse({
    eventId: "event-1",
    title: "Title",
    date: "2026-01-01",
    startTime: "10:00",
    endTime: "11:00",
    visibility: "PUBLIC",
    type: "EVENT",
    recurrenceFreq: "NONE",
    scope: null
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.scope, "THIS_EVENT");
});

test("deleteEventSchema defaults scope when null is provided", () => {
  const parsed = deleteEventSchema.safeParse({
    eventId: "event-1",
    scope: null
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.scope, "THIS_EVENT");
});
