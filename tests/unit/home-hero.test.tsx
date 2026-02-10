import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HomeHero from "@/components/home/home-hero";

const weekCompletion = {
  completedCount: 7,
  totalCount: 12,
  percent: 58
};

test("Home hero renders progress ring and completion chip", () => {
  const markup = renderToStaticMarkup(
    createElement(HomeHero, {
      locale: "en",
      weekCompletion,
      nextEvents: [],
      announcements: []
    })
  );

  assert.match(markup, /58%/);
  assert.match(markup, /7\/12 complete/);
  assert.match(markup, /View This Week/);
});
