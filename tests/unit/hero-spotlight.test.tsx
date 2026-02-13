import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GratitudeSpotlightCard from "@/components/gratitude/GratitudeSpotlightCard";
import { withI18n } from "@/tests/utils/i18n";

test("Gratitude spotlight renders nominees and respects limit", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(GratitudeSpotlightCard, {
        enabled: true,
        limit: 2,
        items: [
          { id: "nom-1", nomineeName: "Ava L.", reason: "Stepped in to lead." },
          { id: "nom-2", nomineeName: "", reason: "Covered extra shifts." },
          { id: "nom-3", nomineeName: "Jordan K.", reason: "Helped with setup." }
        ]
      })
    )
  );

  assert.match(markup, /Ava L\./);
  assert.match(markup, /Parishioner/);
  assert.match(markup, /\+1 more/);
});
