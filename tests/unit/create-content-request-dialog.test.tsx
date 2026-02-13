import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { withI18n } from "@/tests/utils/i18n";
import CreateContentRequestDialog from "@/components/requests/CreateContentRequestDialog";

test("CreateContentRequestDialog renders only provided joined groups", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(CreateContentRequestDialog, {
        open: true,
        onOpenChange: () => undefined,
        sourceScreen: "serve",
        groupOptions: [
          { id: "g1", name: "Joined Group A" },
          { id: "g2", name: "Joined Group B" }
        ]
      })
    )
  );

  assert.match(markup, /Joined Group A/);
  assert.match(markup, /Joined Group B/);
  assert.doesNotMatch(markup, /Not Joined Group/);
});
