import { test } from "node:test";
import assert from "node:assert/strict";
import { getMessageReadProgress } from "@/lib/chat/read-indicator";

test("getMessageReadProgress returns unread when nobody read", () => {
  const messageAt = new Date("2025-01-01T10:00:00.000Z");
  const progress = getMessageReadProgress(messageAt, [], 3);

  assert.equal(progress.state, "unread");
  assert.equal(progress.readersCount, 0);
  assert.equal(progress.recipientCount, 3);
});

test("getMessageReadProgress returns some_read when one recipient read", () => {
  const messageAt = new Date("2025-01-01T10:00:00.000Z");
  const progress = getMessageReadProgress(messageAt, [messageAt.getTime() + 1000], 3);

  assert.equal(progress.state, "some_read");
  assert.equal(progress.readersCount, 1);
  assert.equal(progress.recipientCount, 3);
});

test("getMessageReadProgress returns all_read when everyone read", () => {
  const messageAt = new Date("2025-01-01T10:00:00.000Z");
  const progress = getMessageReadProgress(
    messageAt,
    [
      messageAt.getTime() + 1000,
      messageAt.getTime() + 2000,
      messageAt.getTime() + 3000
    ],
    3
  );

  assert.equal(progress.state, "all_read");
  assert.equal(progress.readersCount, 3);
  assert.equal(progress.recipientCount, 3);
});
