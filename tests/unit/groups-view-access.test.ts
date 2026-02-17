import { test } from "node:test";
import assert from "node:assert/strict";
import { getDiscoverGroupCardAction } from "@/components/groups/GroupsView";

test("invite-only group for non-member opens limited membership state", () => {
  const action = getDiscoverGroupCardAction({
    joinPolicy: "INVITE_ONLY",
    membershipStatus: null
  });

  assert.equal(action, "show_limited_membership");
});

test("invite-only group with membership keeps normal navigation", () => {
  const action = getDiscoverGroupCardAction({
    joinPolicy: "INVITE_ONLY",
    membershipStatus: "ACTIVE"
  });

  assert.equal(action, "navigate");
});

test("request-to-join group still triggers request flow", () => {
  const action = getDiscoverGroupCardAction({
    joinPolicy: "REQUEST_TO_JOIN",
    membershipStatus: null
  });

  assert.equal(action, "request_to_join");
});
