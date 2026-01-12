import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CalendarView from "@/components/calendar/CalendarView";

const now = new Date("2024-05-08T12:00:00.000Z");
const weekRange = {
  start: new Date("2024-05-06T00:00:00.000Z"),
  end: new Date("2024-05-13T00:00:00.000Z")
};
const monthRange = {
  start: new Date("2024-05-01T00:00:00.000Z"),
  end: new Date("2024-06-01T00:00:00.000Z")
};
const sampleEvent = {
  id: "event-1",
  title: "Morning Mass",
  startsAt: new Date("2024-05-06T09:00:00.000Z"),
  endsAt: new Date("2024-05-06T10:00:00.000Z"),
  location: "Main chapel",
  summary: null,
  parishId: "parish-1"
};

test("Calendar view toggle renders week layout by default", () => {
  const markup = renderToStaticMarkup(
    createElement(CalendarView, {
      weekRange,
      monthRange,
      weekEvents: [sampleEvent],
      monthEvents: [sampleEvent],
      now,
      initialView: "week"
    })
  );

  assert.match(markup, /data-testid="calendar-week-grid"/);
  assert.match(markup, /role="tabpanel"[^>]*hidden[^>]*>.*calendar-month-grid/s);
  assert.match(markup, /role="tab"[^>]*aria-selected="true"[^>]*>Week/);
});

test("Calendar view toggle can render month layout", () => {
  const markup = renderToStaticMarkup(
    createElement(CalendarView, {
      weekRange,
      monthRange,
      weekEvents: [sampleEvent],
      monthEvents: [sampleEvent],
      now,
      initialView: "month"
    })
  );

  assert.match(markup, /data-testid="calendar-month-grid"/);
  assert.match(markup, /role="tabpanel"[^>]*hidden[^>]*>.*calendar-week-grid/s);
  assert.match(markup, /role="tab"[^>]*aria-selected="true"[^>]*>Month/);
});
