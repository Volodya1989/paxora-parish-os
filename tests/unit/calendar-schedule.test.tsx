import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ScheduleView from "@/components/calendar/ScheduleView";
import CalendarView from "@/components/calendar/CalendarView";

const now = new Date("2024-06-10T08:00:00.000Z");
const event = {
  id: "event-1",
  instanceId: "event-1-1718019600000",
  title: "Divine Liturgy",
  startsAt: new Date("2024-06-10T09:00:00.000Z"),
  endsAt: new Date("2024-06-10T10:00:00.000Z"),
  location: "Main nave",
  summary: "Sunday liturgy with choir.",
  parishId: "parish-1",
  visibility: "PUBLIC" as const,
  group: null,
  type: "SERVICE" as const,
  recurrenceFreq: "WEEKLY" as const,
  recurrenceInterval: 1,
  recurrenceByWeekday: [],
  recurrenceUntil: null,
  rsvpResponse: null,
  rsvpYesCount: 3,
  canManage: true
};

const weekRange = {
  start: new Date("2024-06-10T00:00:00.000Z"),
  end: new Date("2024-06-17T00:00:00.000Z")
};
const monthRange = {
  start: new Date("2024-06-01T00:00:00.000Z"),
  end: new Date("2024-07-01T00:00:00.000Z")
};
const nextWeekRange = {
  start: new Date("2024-06-17T00:00:00.000Z"),
  end: new Date("2024-06-24T00:00:00.000Z")
};

test("ScheduleView renders day grouping", () => {
  const markup = renderToStaticMarkup(
    createElement(ScheduleView, {
      events: [event],
      now,
      isEditor: true,
      onSelectEvent: () => undefined
    })
  );

  assert.match(markup, /Today/);
  assert.match(markup, /Divine Liturgy/);
  assert.match(markup, /Repeats weekly/);
  assert.match(markup, /RSVPs: 3/);
});

test("CalendarView disables add button when user lacks permissions", () => {
  const markup = renderToStaticMarkup(
    createElement(CalendarView, {
      weekRange,
      monthRange,
      nextWeekRange,
      weekEvents: [event],
      monthEvents: [event],
      nextWeekEvents: [event],
      now,
      initialView: "week",
      canCreateEvents: false,
      canCreatePublicEvents: false,
      canCreatePrivateEvents: false,
      canCreateGroupEvents: false,
      isEditor: false,
      groupOptions: [],
      viewerGroupIds: []
    })
  );

  assert.match(markup, /disabled/);
});
