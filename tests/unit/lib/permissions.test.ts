import { test } from "node:test";
import assert from "node:assert/strict";
import { isParishLeader, canManageGroupMembership } from "@/lib/permissions";

test("parish role checks gate leader permissions", () => {
  assert.equal(isParishLeader("ADMIN"), true);
  assert.equal(isParishLeader("SHEPHERD"), true);
  assert.equal(isParishLeader("MEMBER"), false);
});

test("group leads can manage membership when allowed", () => {
  assert.equal(canManageGroupMembership("MEMBER", "COORDINATOR"), true);
  assert.equal(canManageGroupMembership("MEMBER", "PARISHIONER"), false);
});
