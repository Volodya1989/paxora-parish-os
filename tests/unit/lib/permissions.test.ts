import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isParishLeader,
  canManageGroupMembership,
  canPostAnnouncementChannel,
  canPostGroupChannel,
  canModerateChatChannel
} from "@/lib/permissions";

test("parish role checks gate leader permissions", () => {
  assert.equal(isParishLeader("ADMIN"), true);
  assert.equal(isParishLeader("SHEPHERD"), true);
  assert.equal(isParishLeader("MEMBER"), false);
});

test("group leads can manage membership when allowed", () => {
  assert.equal(canManageGroupMembership("MEMBER", "COORDINATOR"), true);
  assert.equal(canManageGroupMembership("MEMBER", "PARISHIONER"), false);
});

test("announcement posting requires leader or coordinator", () => {
  assert.equal(canPostAnnouncementChannel("ADMIN", false), true);
  assert.equal(canPostAnnouncementChannel("SHEPHERD", false), true);
  assert.equal(canPostAnnouncementChannel("MEMBER", true), true);
  assert.equal(canPostAnnouncementChannel("MEMBER", false), false);
});

test("group posting requires leader or active group member", () => {
  assert.equal(canPostGroupChannel("ADMIN", false), true);
  assert.equal(canPostGroupChannel("MEMBER", true), true);
  assert.equal(canPostGroupChannel("MEMBER", false), false);
});

test("chat moderation requires leader or coordinator", () => {
  assert.equal(canModerateChatChannel("SHEPHERD", false), true);
  assert.equal(canModerateChatChannel("MEMBER", true), true);
  assert.equal(canModerateChatChannel("MEMBER", false), false);
});
