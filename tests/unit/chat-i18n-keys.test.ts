import { test } from "node:test";
import assert from "node:assert/strict";
import { getTranslator } from "@/lib/i18n/translator";

test("chat keys exist for English and Ukrainian", () => {
  const en = getTranslator("en");
  const uk = getTranslator("uk");

  assert.equal(en("chat.loadOlder"), "Load older messages");
  assert.equal(uk("chat.loadOlder"), "Завантажити старіші повідомлення");
  assert.equal(en("chat.writeMessagePlaceholder"), "Write a message...");
  assert.equal(uk("chat.writeMessagePlaceholder"), "Напишіть повідомлення...");
});
