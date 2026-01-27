import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageSwitcherSelect } from "@/components/navigation/LanguageSwitcher";
import { buildLocaleSwitchPath } from "@/lib/i18n/routing";

test("LanguageSwitcherSelect renders locale options", () => {
  const markup = renderToStaticMarkup(
    createElement(LanguageSwitcherSelect, {
      locale: "en",
      label: "Language",
      onChange: () => undefined
    })
  );

  assert.match(markup, /EN/);
  assert.match(markup, /УК/);
  assert.match(markup, /value="en"/);
});

test("buildLocaleSwitchPath preserves path and query", () => {
  const nextPath = buildLocaleSwitchPath("/en/tasks", "view=opportunities", "uk");
  assert.equal(nextPath, "/uk/tasks?view=opportunities");
});
