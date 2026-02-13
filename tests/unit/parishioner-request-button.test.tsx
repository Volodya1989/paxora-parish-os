import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ParishionerRequestButton from "@/components/requests/ParishionerRequestButton";

test("ParishionerRequestButton does not render for non-parishioners", () => {
  const markup = renderToStaticMarkup(
    createElement(ParishionerRequestButton, {
      canRequest: false,
      requesterEmail: "member@example.com",
      contextType: "GROUP"
    })
  );

  assert.equal(markup, "");
});
