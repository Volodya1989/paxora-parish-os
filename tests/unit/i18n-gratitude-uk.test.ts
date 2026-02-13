import { test } from "node:test";
import assert from "node:assert/strict";
import { getTranslator } from "@/lib/i18n/translator";

test("Ukrainian gratitude spotlight copy is translated", () => {
  const t = getTranslator("uk");
  assert.equal(t("thisWeek.gratitudeSpotlight.title"), "Фокус вдячності");
  assert.equal(t("thisWeek.gratitudeSpotlight.subtitle"), "Головні подяки цього тижня");
  assert.equal(t("thisWeek.gratitudeSpotlight.viewBoard"), "Переглянути дошку");
});
