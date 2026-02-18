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

test("getMessageReadProgress returns unread when recipientCount is zero", () => {
  const messageAt = new Date("2025-01-01T10:00:00.000Z");
  const progress = getMessageReadProgress(messageAt, [], 0);

  assert.equal(progress.state, "unread");
  assert.equal(progress.readersCount, 0);
  assert.equal(progress.recipientCount, 0);
});

test("getMessageReadProgress accepts numeric timestamp for messageCreatedAt", () => {
  const messageTs = Date.parse("2025-01-01T10:00:00.000Z");
  const progress = getMessageReadProgress(messageTs, [messageTs + 500], 1);

  assert.equal(progress.state, "all_read");
  assert.equal(progress.readersCount, 1);
});

test("getMessageReadProgress treats read-at exactly equal to message time as a reader", () => {
  const messageAt = new Date("2025-01-01T10:00:00.000Z");
  const ts = messageAt.getTime();
  // lastReadAt === messageCreatedAt means user had the room open at that instant
  const progress = getMessageReadProgress(messageAt, [ts], 1);

  assert.equal(progress.state, "all_read");
  assert.equal(progress.readersCount, 1);
});

test("getMessageReadProgress ignores recipients who read before message was sent", () => {
  const messageAt = new Date("2025-01-01T10:00:00.000Z");
  const readBefore = messageAt.getTime() - 5000;
  const progress = getMessageReadProgress(messageAt, [readBefore], 1);

  assert.equal(progress.state, "unread");
  assert.equal(progress.readersCount, 0);
});

test("state mapping: unread -> gray, some_read -> yellow, all_read -> green", () => {
  const messageAt = new Date("2025-01-01T10:00:00.000Z");
  const ts = messageAt.getTime();

  const gray = getMessageReadProgress(messageAt, [], 2);
  assert.equal(gray.state, "unread");

  const yellow = getMessageReadProgress(messageAt, [ts + 1000], 2);
  assert.equal(yellow.state, "some_read");

  const green = getMessageReadProgress(messageAt, [ts + 1000, ts + 2000], 2);
  assert.equal(green.state, "all_read");
});

test("getMessageReadProgress handles empty sorted array with positive recipientCount", () => {
  const messageAt = new Date("2025-01-01T10:00:00.000Z");
  // This mimics snapshot parse where readAtByUserId has no entry for some participants
  // e.g. participants exist but no read states recorded yet
  const progress = getMessageReadProgress(messageAt, [], 2);

  assert.equal(progress.state, "unread");
  assert.equal(progress.readersCount, 0);
  assert.equal(progress.recipientCount, 2);
});

test("getMessageReadProgress with recipientCount larger than sorted array", () => {
  const messageAt = new Date("2025-01-01T10:00:00.000Z");
  // 3 recipients but only 1 has a read state entry — the other 2 never opened the room
  const progress = getMessageReadProgress(
    messageAt,
    [messageAt.getTime() + 1000],
    3
  );

  assert.equal(progress.state, "some_read");
  assert.equal(progress.readersCount, 1);
  assert.equal(progress.recipientCount, 3);
});

test("1:1 chat: single recipient read transitions directly to all_read", () => {
  const messageAt = new Date("2025-01-01T10:00:00.000Z");
  const progress = getMessageReadProgress(messageAt, [messageAt.getTime() + 1000], 1);

  // In 1:1, some_read and all_read collapse since there's only one recipient
  assert.equal(progress.state, "all_read");
  assert.equal(progress.readersCount, 1);
  assert.equal(progress.recipientCount, 1);
});
