import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AccessGateContent from "@/components/access/AccessGateContent";

const parishName = "St. Brigid";

test("Access gate renders request access state", () => {
  const markup = renderToStaticMarkup(
    createElement(AccessGateContent, { status: "none", parishName })
  );

  assert.match(markup, /Request access/);
  assert.match(markup, /St. Brigid/);
});

test("Access gate renders pending state", () => {
  const markup = renderToStaticMarkup(
    createElement(AccessGateContent, { status: "pending", parishName })
  );

  assert.match(markup, /Access pending/);
  assert.match(markup, /notify you/);
});

test("Access gate renders approved state", () => {
  const markup = renderToStaticMarkup(
    createElement(AccessGateContent, { status: "approved", parishName })
  );

  assert.match(markup, /Access granted/);
  assert.match(markup, /dashboard/);
});
