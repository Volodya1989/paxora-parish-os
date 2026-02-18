import { test } from "node:test";
import assert from "node:assert/strict";
import { getScrollBehavior, getServeCardAnchorId, isTaskCardFullyVisible } from "@/lib/tasks/serveCardMove";

test("builds stable serve card anchor ids", () => {
  assert.equal(getServeCardAnchorId("abc123"), "serve-card-abc123");
});

test("detects when the moved card is in the viewport", () => {
  assert.equal(isTaskCardFullyVisible({ top: 24, bottom: 300 }, 700), true);
  assert.equal(isTaskCardFullyVisible({ top: -2, bottom: 300 }, 700), false);
  assert.equal(isTaskCardFullyVisible({ top: 24, bottom: 710 }, 700), false);
});

test("uses non-animated scroll for reduced motion", () => {
  assert.equal(getScrollBehavior(true), "auto");
  assert.equal(getScrollBehavior(false), "smooth");
});
