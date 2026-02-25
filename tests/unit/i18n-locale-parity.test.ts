import { test } from "node:test";
import assert from "node:assert/strict";
import en from "@/messages/en.json";
import uk from "@/messages/uk.json";
import es from "@/messages/es.json";

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

test("All locales share the same translation key set", () => {
  const enKeys = new Set(collectLeafKeys(en));

  const localeMaps = [
    ["uk", new Set(collectLeafKeys(uk))],
    ["es", new Set(collectLeafKeys(es))]
  ] as const;

  for (const [localeName, localeKeys] of localeMaps) {
    const missingInLocale = [...enKeys].filter((key) => !localeKeys.has(key));
    const missingInEn = [...localeKeys].filter((key) => !enKeys.has(key));

    assert.deepEqual(missingInLocale, [], `Missing in ${localeName}: ${missingInLocale.join(", ")}`);
    assert.deepEqual(missingInEn, [], `Missing in en from ${localeName}: ${missingInEn.join(", ")}`);
  }
});


test("Spanish locale includes translated copy for core experience labels", () => {
  assert.equal(es.nav.reliability, "Confiabilidad");
  assert.equal(es.serve.requestOpportunity, "Solicitar una oportunidad");
  assert.equal(es.thisWeek.showQuote, "Mostrar cita");
  assert.notEqual(es.nav.reliability, en.nav.reliability);
});
