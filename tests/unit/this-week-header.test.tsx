import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ThisWeekHeader from "@/components/this-week/ThisWeekHeader";

const weekOptions = [
  { value: "previous" as const, label: "2024-W35", range: "Aug 26 – Sep 2" },
  { value: "current" as const, label: "2024-W36", range: "Sep 2 – Sep 9" },
  { value: "next" as const, label: "2024-W37", range: "Sep 9 – Sep 16" }
];

test("This Week header renders title, progress, and completion chip", () => {
  const markup = renderToStaticMarkup(
    createElement(ThisWeekHeader, {
      title: "This Week",
      weekLabel: "2024-W36",
      dateRange: "Sep 2 – Sep 9",
      updatedLabel: "Updated 9:15 AM",
      completionLabel: "3/8 done",
      completionPct: 38,
      weekSelection: "current",
      weekOptions
    })
  );

  assert.match(markup, /This Week/);
  assert.match(markup, /38%/);
  assert.match(markup, /3\/8 done/);
});

test("Week switcher buttons are accessible", () => {
  const markup = renderToStaticMarkup(
    createElement(ThisWeekHeader, {
      title: "This Week",
      weekLabel: "2024-W36",
      dateRange: "Sep 2 – Sep 9",
      updatedLabel: "Updated 9:15 AM",
      completionLabel: "3/8 done",
      completionPct: 38,
      weekSelection: "current",
      weekOptions
    })
  );

  assert.match(markup, /aria-label="Previous week"/);
  assert.match(markup, /aria-label="Next week"/);
});
