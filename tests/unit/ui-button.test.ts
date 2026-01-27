import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Button from "@/components/ui/Button";
import { withI18n } from "@/tests/utils/i18n";

test("Button renders variants", () => {
  const variants = {
    primary: /bg-primary-700/,
    secondary: /border-mist-200/,
    ghost: /hover:bg-mist-100/,
    danger: /bg-rose-600/
  };

  (Object.entries(variants) as Array<[keyof typeof variants, RegExp]>).forEach(
    ([variant, pattern]) => {
      const markup = renderToStaticMarkup(
        withI18n(createElement(Button, { variant }, "Test"))
      );
      assert.match(markup, pattern);
    }
  );
});

test("Button supports disabled and loading states", () => {
  const disabledMarkup = renderToStaticMarkup(
    withI18n(createElement(Button, { disabled: true }, "Disabled"))
  );
  assert.match(disabledMarkup, /disabled/);

  const loadingMarkup = renderToStaticMarkup(
    withI18n(createElement(Button, { isLoading: true }, "Saving"))
  );
  assert.match(loadingMarkup, /aria-busy=\"true\"/);
  assert.match(loadingMarkup, /Loading/);
  assert.match(loadingMarkup, /disabled/);
});
