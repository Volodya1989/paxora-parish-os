import { test } from "node:test";
import assert from "node:assert/strict";
import en from "@/messages/en.json";
import uk from "@/messages/uk.json";

function collectLeafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object") {
      return collectLeafKeys(child, nextPrefix);
    }
    return [nextPrefix];
  });
}

test("English and Ukrainian locales share the same translation key set", () => {
  const enKeys = new Set(collectLeafKeys(en));
  const ukKeys = new Set(collectLeafKeys(uk));

  const missingInUk = [...enKeys].filter((key) => !ukKeys.has(key));
  const missingInEn = [...ukKeys].filter((key) => !enKeys.has(key));

  assert.deepEqual(missingInUk, [], `Missing in uk: ${missingInUk.join(", ")}`);
  assert.deepEqual(missingInEn, [], `Missing in en: ${missingInEn.join(", ")}`);
});
