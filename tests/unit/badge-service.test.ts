import { test } from "node:test";
import assert from "node:assert/strict";
import { updateAppBadge } from "@/lib/push/client/badge";

test("updateAppBadge clears the badge when count is zero", async () => {
  let clearCalled = false;

  Object.defineProperty(globalThis, "navigator", {
    value: {
      clearAppBadge: async () => {
        clearCalled = true;
      }
    },
    configurable: true
  });

  await updateAppBadge(0, "test");

  assert.equal(clearCalled, true);
});
