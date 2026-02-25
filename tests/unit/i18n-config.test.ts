import { test } from "node:test";
import assert from "node:assert/strict";
import { localeCatalog, locales, localeStorageKey } from "@/lib/i18n/config";

test("active locales include English, Ukrainian, and Spanish", () => {
  assert.deepEqual(locales, ["en", "uk", "es"]);
});

test("locale catalog includes Spanish locale", () => {
  assert.ok(localeCatalog.includes("es"));
});

test("locale storage key is stable", () => {
  assert.equal(localeStorageKey, "paxora_locale");
});

