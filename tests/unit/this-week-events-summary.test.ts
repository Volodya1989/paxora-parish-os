import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEventsSummary } from "@/lib/this-week/eventsSummary";
import { getTranslator } from "@/lib/i18n/translator";

const baseEvent = {
  id: "event-1",
  title: "Liturgy",
  endsAt: new Date("2025-01-20T16:00:00Z"),
  location: null
};

test("shows today label when an upcoming event is later today", () => {
  const t = getTranslator("en");
  const summary = buildEventsSummary({
    events: [{ ...baseEvent, startsAt: new Date("2025-01-20T15:00:00Z") }],
    locale: "en",
    now: new Date("2025-01-20T14:00:00Z"),
    t
  });

  assert.match(summary, /^Today at /);
});

test("shows next event and weekday when no events remain today", () => {
  const t = getTranslator("en");
  const summary = buildEventsSummary({
    events: [{ ...baseEvent, startsAt: new Date("2025-01-21T15:00:00Z") }],
    locale: "en",
    now: new Date("2025-01-20T20:00:00Z"),
    t
  });

  assert.match(summary, /^Next Event at .* • /);
});

test("shows empty state when no upcoming events exist", () => {
  const t = getTranslator("uk");
  const summary = buildEventsSummary({
    events: [{ ...baseEvent, startsAt: new Date("2025-01-19T15:00:00Z") }],
    locale: "uk",
    now: new Date("2025-01-20T12:00:00Z"),
    t
  });

  assert.equal(summary, "Немає запланованих подій");
});
