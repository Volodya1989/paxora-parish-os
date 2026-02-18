import { test } from "node:test";
import assert from "node:assert/strict";
import { sortThisWeekMemberGroups, type ThisWeekMemberGroupPreview } from "@/lib/queries/this-week";

function group(overrides: Partial<ThisWeekMemberGroupPreview> & { id: string; name: string }): ThisWeekMemberGroupPreview {
  const { id, name, ...rest } = overrides;

  return {
    id,
    name,
    visibility: "PUBLIC",
    description: null,
    unreadCount: 0,
    lastMessage: null,
    lastMessageTime: null,
    lastMessageAuthor: null,
    ...rest
  };
}

test("sortThisWeekMemberGroups places unread chats before read chats even if read chat is newer", () => {
  const unreadOlder = group({
    id: "a",
    name: "Unread A",
    unreadCount: 1,
    lastMessageTime: new Date("2026-01-01T08:00:00.000Z")
  });
  const readNewer = group({
    id: "b",
    name: "Read B",
    unreadCount: 0,
    lastMessageTime: new Date("2026-01-02T08:00:00.000Z")
  });

  const sorted = sortThisWeekMemberGroups([readNewer, unreadOlder]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["a", "b"]
  );
});

test("sortThisWeekMemberGroups orders unread chats by newest last message first", () => {
  const unreadOlder = group({
    id: "a",
    name: "Unread A",
    unreadCount: 2,
    lastMessageTime: new Date("2026-01-01T08:00:00.000Z")
  });
  const unreadNewer = group({
    id: "b",
    name: "Unread B",
    unreadCount: 1,
    lastMessageTime: new Date("2026-01-03T08:00:00.000Z")
  });

  const sorted = sortThisWeekMemberGroups([unreadOlder, unreadNewer]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["b", "a"]
  );
});

test("sortThisWeekMemberGroups handles empty and single-group lists", () => {
  assert.deepEqual(sortThisWeekMemberGroups([]), []);

  const only = group({ id: "single", name: "Only group", unreadCount: 0 });
  const sorted = sortThisWeekMemberGroups([only]);

  assert.deepEqual(sorted.map((item) => item.id), ["single"]);
});
