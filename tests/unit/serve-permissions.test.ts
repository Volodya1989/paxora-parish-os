import { test } from "node:test";
import assert from "node:assert/strict";
import { canAccessServeBoard, canRequestOpportunity } from "@/lib/permissions";

test("parishioners can request opportunities", () => {
  assert.equal(canRequestOpportunity("MEMBER"), true);
});

test("clergy and admins cannot request opportunities", () => {
  assert.equal(canRequestOpportunity("SHEPHERD"), false);
  assert.equal(canRequestOpportunity("ADMIN"), false);
});

test("serve board is available to leaders and coordinators", () => {
  assert.equal(canAccessServeBoard("ADMIN", false), true);
  assert.equal(canAccessServeBoard("SHEPHERD", false), true);
  assert.equal(canAccessServeBoard("MEMBER", true), true);
  assert.equal(canAccessServeBoard("MEMBER", false), false);
});
