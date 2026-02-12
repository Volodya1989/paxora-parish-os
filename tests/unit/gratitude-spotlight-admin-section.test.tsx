import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GratitudeSpotlightAdminSection from "@/components/this-week/admin/GratitudeSpotlightAdminSection";

test("This Week admin spotlight section exposes nomination entry CTA", () => {
  const markup = renderToStaticMarkup(
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
  );

  assert.match(markup, /Add nominee/);
});

test("Non-admin spotlight section hides nomination entry CTA", () => {
  const markup = renderToStaticMarkup(
    createElement(GratitudeSpotlightAdminSection, {
      weekId: "week-1",
      spotlight: {
        enabled: true,
        limit: 3,
        items: []
      },
      admin: null
    })
  );

  assert.doesNotMatch(markup, /Add nominee/);
});
