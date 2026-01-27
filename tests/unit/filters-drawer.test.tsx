import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FiltersDrawer from "@/components/app/filters-drawer";
import { withI18n } from "@/tests/utils/i18n";

test("FiltersDrawer renders trigger button", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(FiltersDrawer, { title: "Filters" }, createElement("div", null, "Content"))
    )
  );

  assert.match(markup, /Filters/);
});
