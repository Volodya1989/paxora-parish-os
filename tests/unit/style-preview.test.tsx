import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import StylePreview from "@/components/StylePreview";
import { withI18n } from "@/tests/utils/i18n";

test("StylePreview renders typography, buttons, and card tokens", () => {
  const markup = renderToStaticMarkup(withI18n(<StylePreview />));

  assert.match(markup, /Heading One/);
  assert.match(markup, /Heading Two/);
  assert.match(markup, /Heading Three/);
  assert.match(markup, /text-h1/);
  assert.match(markup, /text-h2/);
  assert.match(markup, /text-h3/);
  assert.match(markup, /text-body/);
  assert.match(markup, /text-caption/);
  assert.match(markup, /bg-primary-700/);
  assert.match(markup, /shadow-card/);
});
