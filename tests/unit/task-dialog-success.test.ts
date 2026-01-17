import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldCloseTaskDialog } from "@/components/tasks/taskDialogSuccess";
import type { TaskActionState } from "@/server/actions/taskState";

test("shouldCloseTaskDialog returns true for first success", () => {
  const state: TaskActionState = { status: "success" };
  assert.equal(shouldCloseTaskDialog(state, false), true);
});

test("shouldCloseTaskDialog returns false after success handled", () => {
  const state: TaskActionState = { status: "success" };
  assert.equal(shouldCloseTaskDialog(state, true), false);
});

test("shouldCloseTaskDialog returns false for non-success", () => {
  const state: TaskActionState = { status: "error", message: "Invalid" };
  assert.equal(shouldCloseTaskDialog(state, false), false);
});
