import test from "node:test";
import assert from "node:assert/strict";
import { extractMentionedUserIds, normalizeMentionEntities } from "@/lib/mentions";

test("normalizeMentionEntities drops malformed entries", () => {
  const entities = normalizeMentionEntities([
    { userId: "u1", displayName: "John Doe", email: "john@example.com", start: 0, end: 9 },
    { userId: "", displayName: "Bad", email: "bad@example.com", start: 1, end: 4 },
    { userId: "u2", displayName: "Jane", email: "jane@example.com", start: 4, end: 8 }
  ]);

  assert.equal(entities.length, 1);
  assert.equal(entities[0]?.userId, "u1");
});

test("extractMentionedUserIds only accepts exact inserted mentions", () => {
  const body = "Hello @John Doe and @Jane";
  const ids = extractMentionedUserIds(body, [
    { userId: "u1", displayName: "John Doe", email: "john@example.com", start: 6, end: 15 },
    { userId: "u2", displayName: "Jane", email: "jane@example.com", start: 20, end: 25 }
  ]);

  assert.deepEqual(ids, ["u1", "u2"]);

  const invalid = extractMentionedUserIds(body, [
    { userId: "u3", displayName: "Johnny", email: "johnny@example.com", start: 6, end: 13 }
  ]);

  assert.deepEqual(invalid, []);
});
