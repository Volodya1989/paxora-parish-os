import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import ParishSetup from "@/components/setup/ParishSetup";

test("Parish setup renders create parish CTA", () => {
  const markup = renderToStaticMarkup(createElement(ParishSetup, { action: "/setup" }));
  assert.match(markup, /Create your parish/);
  assert.match(markup, /Create parish/);
});
