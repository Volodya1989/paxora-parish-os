import { test } from "node:test";
import assert from "node:assert/strict";
import { getTranslator } from "@/lib/i18n/translator";

test("translator returns expected locale string", () => {
  const t = getTranslator("uk");
  assert.equal(t("nav.thisWeek"), "Цей тиждень");
});
