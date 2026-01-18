import { test } from "node:test";
import assert from "node:assert/strict";
import { getTasksViewMode } from "@/lib/tasks/viewMode";

test("Parishioners default to opportunities view", () => {
  const mode = getTasksViewMode({ sessionRole: "MEMBER", searchParams: {} });
  assert.equal(mode, "opportunities");
});

test("Parishioners can switch to my tasks view", () => {
  const mode = getTasksViewMode({ sessionRole: "MEMBER", searchParams: { view: "mine" } });
  assert.equal(mode, "mine");
});

test("Admins default to all tasks view", () => {
  const mode = getTasksViewMode({ sessionRole: "ADMIN", searchParams: {} });
  assert.equal(mode, "all");
});
