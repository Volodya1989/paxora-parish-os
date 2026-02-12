import { test } from "node:test";
import assert from "node:assert/strict";
import { routes } from "@/lib/navigation/routes";

test("serve navigation keeps tasks as primary route", () => {
  assert.equal(routes.serve, "/tasks");
});

test("serve leader board route is discoverable as dedicated path", () => {
  assert.equal(routes.serveBoard, "/serve-board");
});

test("gratitude board route exists for GratitudeEntryCard", () => {
  assert.equal(routes.gratitudeBoard, "/gratitude-board");
});
