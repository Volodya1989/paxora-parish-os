import assert from "node:assert/strict";
import { test } from "node:test";
import { selectDefaultParishId } from "../../lib/parish/selection";

test("selectDefaultParishId prefers explicit active parish", () => {
  const selected = selectDefaultParishId({
    activeParishId: "parish-2",
    memberships: [{ parishId: "parish-1" }]
  });

  assert.equal(selected, "parish-2");
});

test("selectDefaultParishId falls back to first membership", () => {
  const selected = selectDefaultParishId({
    memberships: [{ parishId: "parish-1" }, { parishId: "parish-2" }]
  });

  assert.equal(selected, "parish-1");
});

test("selectDefaultParishId returns null when no memberships", () => {
  const selected = selectDefaultParishId({ memberships: [] });

  assert.equal(selected, null);
});
