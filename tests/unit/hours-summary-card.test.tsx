import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HoursSummaryCard from "@/components/hours/HoursSummaryCard";

test("Hours summary card renders week and month totals", () => {
  const markup = renderToStaticMarkup(
    createElement(HoursSummaryCard, {
      weekTotal: 12.5,
      monthTotal: 40
    })
  );

  assert.match(markup, /12.5 hrs/);
  assert.match(markup, /40.0 hrs/);
  assert.match(markup, /This week/);
  assert.match(markup, /This month/);
});
