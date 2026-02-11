import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MyRequestsList from "@/components/requests/MyRequestsList";
import { withI18n } from "@/tests/utils/i18n";

test("MyRequestsList renders empty localized state without server crash", () => {
  const html = renderToStaticMarkup(
    withI18n(createElement(MyRequestsList, { requests: [] }), "en")
  );

  assert.match(html, /No requests yet/);
});
