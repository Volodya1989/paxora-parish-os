import { test } from "node:test";
import assert from "node:assert/strict";
import { createTranslator, getTranslator } from "@/lib/i18n/translator";
import { getMessages } from "@/lib/i18n/messages";

test("translator returns expected locale string", () => {
  const t = getTranslator("uk");
  assert.equal(t("nav.thisWeek"), "Цей тиждень");
});

test("translator falls back to English when locale key is missing", () => {
  const en = getMessages("en");
  const t = createTranslator("uk", {} as typeof en, en);
  assert.equal(t("chat.channelLocked"), "This channel is locked.");
});
