import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getOwnerParamForViewChange,
  shouldShowOwnershipFilter,
  shouldShowParishionerAddButton
} from "@/lib/tasks/serveView";

test("My commitments hides ownership filter", () => {
  assert.equal(shouldShowOwnershipFilter("mine"), false);
  assert.equal(shouldShowOwnershipFilter("opportunities"), false);
  assert.equal(shouldShowOwnershipFilter("all"), true);
});

test("parishioner add button is hidden in My commitments", () => {
  assert.equal(
    shouldShowParishionerAddButton({
      canManageTasks: false,
      canRequestContentCreate: true,
      viewMode: "mine"
    }),
    false
  );

  assert.equal(
    shouldShowParishionerAddButton({
      canManageTasks: false,
      canRequestContentCreate: true,
      viewMode: "opportunities"
    }),
    true
  );
});

test("switching to My commitments forces owner to mine", () => {
  assert.equal(getOwnerParamForViewChange({ currentOwner: null, nextView: "mine" }), "mine");
  assert.equal(getOwnerParamForViewChange({ currentOwner: "all", nextView: "mine" }), "mine");
  assert.equal(getOwnerParamForViewChange({ currentOwner: "mine", nextView: "all" }), null);
});
