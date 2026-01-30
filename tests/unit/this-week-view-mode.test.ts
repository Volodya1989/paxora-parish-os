import { test } from "node:test";
import assert from "node:assert/strict";
import { getThisWeekViewMode } from "@/lib/this-week/viewMode";

test("Admin defaults to admin view", () => {
  const mode = getThisWeekViewMode({ sessionRole: "ADMIN", searchParams: {} });
  assert.equal(mode, "admin");
});

test("Admin can preview parishioner view", () => {
  const mode = getThisWeekViewMode({
    sessionRole: "SHEPHERD",
    searchParams: { view: "parishioner" }
  });
  assert.equal(mode, "parishioner");
});

test("Parishioner ignores view param", () => {
  const mode = getThisWeekViewMode({
    sessionRole: "MEMBER",
    searchParams: { view: "admin" }
  });
  assert.equal(mode, "parishioner");
});

test("Coordinator can access admin view", () => {
  const mode = getThisWeekViewMode({
    sessionRole: "MEMBER",
    canManage: true,
    searchParams: { view: "admin" }
  });
  assert.equal(mode, "admin");
});
