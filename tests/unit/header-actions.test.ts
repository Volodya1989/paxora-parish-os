import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAddHref, buildWeekHref, normalizeWeekSelection } from "@/components/header/headerUtils";

test("Week switcher updates URL param", () => {
  const href = buildWeekHref("/tasks", "week=current", "next");
  assert.equal(href, "/tasks?week=next");
  assert.equal(normalizeWeekSelection("next"), "next");
  assert.equal(normalizeWeekSelection("current"), "current");
});

test("+ Add menu builds correct create routes", () => {
  assert.equal(buildAddHref("/tasks", "week=current", "task"), "/tasks?week=current&create=task");
  assert.equal(
    buildAddHref("/calendar", "week=next", "event"),
    "/calendar?week=next&create=event"
  );
  assert.equal(buildAddHref("/groups", "", "group"), "/groups?create=group");
});
