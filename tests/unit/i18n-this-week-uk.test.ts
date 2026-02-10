import { test } from "node:test";
import assert from "node:assert/strict";
import { getTranslator } from "@/lib/i18n/translator";

test("Ukrainian thisWeek keys for dashboard cards are translated", () => {
  const t = getTranslator("uk");
  assert.equal(t("thisWeek.announcements"), "Оголошення");
  assert.equal(t("thisWeek.services"), "Служіння");
  assert.equal(t("thisWeek.community"), "Спільнота");
  assert.equal(t("thisWeek.opportunities"), "Можливості");
  assert.equal(t("thisWeek.allRead"), "Усе прочитано");
  assert.equal(t("thisWeek.nextPrefix"), "Наступне:");
  assert.equal(t("thisWeek.latestPrefix"), "Останнє:");
});
