import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GratitudeSpotlightAdminSection from "@/components/this-week/admin/GratitudeSpotlightAdminSection";
import { withI18n } from "@/tests/utils/i18n";

test("This Week admin spotlight section exposes nomination entry CTA for empty spotlight", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(GratitudeSpotlightAdminSection, {
      weekId: "week-1",
      spotlight: {
        enabled: true,
        limit: 3,
        items: []
      },
      admin: {
        settings: {
          enabled: true,
          limit: 3
        },
        nominations: [],
        memberOptions: [{ id: "user-1", name: "Alex", label: "Alex" }]
      }
      })
    )
  );

  assert.match(markup, /Add nominee/);
  assert.match(markup, /No published spotlight nominations yet/);
});

test("Non-admin spotlight section hides nomination entry CTA", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(GratitudeSpotlightAdminSection, {
      weekId: "week-1",
      spotlight: {
        enabled: true,
        limit: 3,
        items: []
      },
      admin: null
      })
    )
  );

  assert.doesNotMatch(markup, /Add nominee/);
});
