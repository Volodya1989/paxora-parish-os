import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CalendarView from "@/components/calendar/CalendarView";
import { withI18n } from "@/tests/utils/i18n";

const now = new Date("2024-05-08T12:00:00.000Z");
const weekRange = {
  start: new Date("2024-05-06T00:00:00.000Z"),
  end: new Date("2024-05-13T00:00:00.000Z")
};
const monthRange = {
  start: new Date("2024-05-01T00:00:00.000Z"),
  end: new Date("2024-06-01T00:00:00.000Z")
};
const nextWeekRange = {
  start: new Date("2024-05-13T00:00:00.000Z"),
  end: new Date("2024-05-20T00:00:00.000Z")
};
const sampleEvent = {
  id: "event-1",
  instanceId: "event-1-1714986000000",
  title: "Morning Mass",
  startsAt: new Date("2024-05-06T09:00:00.000Z"),
  endsAt: new Date("2024-05-06T10:00:00.000Z"),
  location: "Main chapel",
  summary: "Morning worship with the parish.",
  parishId: "parish-1",
  visibility: "PUBLIC" as const,
  group: null,
  type: "SERVICE" as const,
  recurrenceFreq: "NONE" as const,
  recurrenceInterval: 1,
  recurrenceByWeekday: [],
  recurrenceUntil: null,
  rsvpResponse: null,
  rsvpTotalCount: 0,
  canManage: true,
  recurrenceParentId: null,
  isRecurring: false
};

test("Calendar view toggle renders week layout by default", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(CalendarView, {
        weekRange,
        monthRange,
        nextWeekRange,
        weekEvents: [sampleEvent],
        monthEvents: [sampleEvent],
        nextWeekEvents: [sampleEvent],
        now,
        initialView: "week",
        canCreateEvents: true,
        canCreatePublicEvents: true,
        canCreatePrivateEvents: true,
        canCreateGroupEvents: true,
        isEditor: true,
        canManageEventRequests: false,
        groupOptions: [],
        viewerGroupIds: [],
        pendingEventRequests: []
      })
    )
  );

  assert.match(markup, /data-testid="calendar-week-grid"/);
  assert.match(markup, /role="tabpanel"[^>]*hidden[^>]*>.*calendar-month-grid/s);
  assert.match(markup, /role="tab"[^>]*aria-selected="true"[^>]*>Week/);
});

test("Calendar view toggle can render month layout", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(CalendarView, {
        weekRange,
        monthRange,
        nextWeekRange,
        weekEvents: [sampleEvent],
        monthEvents: [sampleEvent],
        nextWeekEvents: [sampleEvent],
        now,
        initialView: "month",
        canCreateEvents: true,
        canCreatePublicEvents: true,
        canCreatePrivateEvents: true,
        canCreateGroupEvents: true,
        isEditor: true,
        canManageEventRequests: false,
        groupOptions: [],
        viewerGroupIds: [],
        pendingEventRequests: []
      })
    )
  );

  assert.match(markup, /data-testid="calendar-month-grid"/);
  assert.match(markup, /role="tabpanel"[^>]*hidden[^>]*>.*calendar-week-grid/s);
  assert.match(markup, /role="tab"[^>]*aria-selected="true"[^>]*>Month/);
});
