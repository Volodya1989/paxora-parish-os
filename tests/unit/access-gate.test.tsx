import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AccessGateContent from "@/components/access/AccessGateContent";

const parishName = "St. Brigid";

test("Access gate renders parish code join state", () => {
  const markup = renderToStaticMarkup(
    createElement(AccessGateContent, { status: "none", parishName, locale: "en" })
  );

  assert.match(markup, /Enter parish code/);
  assert.match(markup, /St. Brigid/);
  assert.match(markup, /Once accepted/);
});

test("Access gate renders pending state", () => {
  const markup = renderToStaticMarkup(
    createElement(AccessGateContent, { status: "pending", parishName, locale: "en" })
  );

  assert.match(markup, /Access pending/);
  assert.match(markup, /receive an email/);
});

test("Access gate renders approved state", () => {
  const markup = renderToStaticMarkup(
    createElement(AccessGateContent, { status: "approved", parishName, locale: "en" })
  );

  assert.match(markup, /Access granted/);
  assert.match(markup, /redirected/);
});
