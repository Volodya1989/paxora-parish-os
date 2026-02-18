import { test } from "node:test";
import assert from "node:assert/strict";
import { getTaskGroupBadgeClass, truncateGroupBadgeLabel } from "@/lib/tasks/groupBadge";

test("getTaskGroupBadgeClass is deterministic", () => {
  const first = getTaskGroupBadgeClass("group-123");
  const second = getTaskGroupBadgeClass("group-123");

  assert.equal(first, second);
  assert.notEqual(first.length, 0);
});

test("getTaskGroupBadgeClass distributes colors across groups", () => {
  const classes = new Set(
    Array.from({ length: 12 }, (_, index) => getTaskGroupBadgeClass(`group-${index + 1}`))
  );

  assert.ok(classes.size > 1);
});

test("truncateGroupBadgeLabel keeps short labels", () => {
  assert.equal(truncateGroupBadgeLabel("Family"), "Family");
});

test("truncateGroupBadgeLabel truncates labels above 10 chars", () => {
  assert.equal(truncateGroupBadgeLabel("LongGroupName"), "LongGroupN…");
});
