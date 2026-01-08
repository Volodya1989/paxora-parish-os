import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Button from "@/components/ui/Button";

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
        createElement(Button, { variant }, "Test")
      );
      assert.match(markup, pattern);
    }
  );
});

test("Button supports disabled and loading states", () => {
  const disabledMarkup = renderToStaticMarkup(
    createElement(Button, { disabled: true }, "Disabled")
  );
  assert.match(disabledMarkup, /disabled/);

  const loadingMarkup = renderToStaticMarkup(
    createElement(Button, { isLoading: true }, "Saving")
  );
  assert.match(loadingMarkup, /aria-busy=\"true\"/);
  assert.match(loadingMarkup, /Loading/);
  assert.match(loadingMarkup, /disabled/);
});
