import { test } from "node:test";
import assert from "node:assert/strict";
import en from "@/messages/en.json";
import uk from "@/messages/uk.json";

test("Serve tab label uses Help needed in EN", () => {
  assert.equal(en.tasks.view.opportunities, "Help needed");
});

test("Serve tab label uses updated Ukrainian copy", () => {
  assert.equal(uk.tasks.view.opportunities, "Потрібна допомога");
});
