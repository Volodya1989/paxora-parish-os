import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ParishionerRequestButton from "@/components/requests/ParishionerRequestButton";
import { withI18n } from "@/tests/utils/i18n";

test("ParishionerRequestButton does not render for non-parishioners", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(ParishionerRequestButton, {
        canRequest: false,
        requesterEmail: "member@example.com",
        sourceScreen: "groups",
        groupOptions: []
      })
    )
  );

  assert.equal(markup, "");
});
