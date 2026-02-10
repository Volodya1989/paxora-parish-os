import { test } from "node:test";
import assert from "node:assert/strict";
import { localeCatalog, locales, localeStorageKey } from "@/lib/i18n/config";

test("active locales remain stable and include English/Ukrainian", () => {
  assert.deepEqual(locales, ["en", "uk"]);
});

test("locale catalog includes staged Spanish locale", () => {
  assert.ok(localeCatalog.includes("es"));
});

test("locale storage key is stable", () => {
  assert.equal(localeStorageKey, "paxora_locale");
});

