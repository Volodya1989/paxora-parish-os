import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvent } from "@/tests/unit/helpers/builders";
import { buildDigestContent, buildDigestSummary, transitionDigestStatus } from "@/domain/digest";

test("digest content is deterministic for tasks and events", () => {
  const tasks = [
    { title: "Alpha Task", status: "OPEN" as const },
    { title: "Bravo Task", status: "DONE" as const }
  ];
  const events = [
    buildEvent({
      title: "Mass",
      startsAt: new Date("2024-09-05T09:00:00.000Z"),
      endsAt: new Date("2024-09-05T10:00:00.000Z"),
      location: "Sanctuary"
    }),
    buildEvent({
      title: "Rehearsal",
      startsAt: new Date("2024-09-04T18:00:00.000Z"),
      endsAt: new Date("2024-09-04T19:00:00.000Z")
    })
  ];

  const output = buildDigestContent({ tasks, events });

  assert.equal(
    output,
    [
      "Tasks",
      "- [ ] Alpha Task",
      "- [x] Bravo Task",
      "",
      "Events",
      "- Rehearsal (18:00-19:00)",
      "- Mass (09:00-10:00) @ Sanctuary"
    ].join("\n")
  );
});

test("digest summary orders items by title and includes location/time details", () => {
  const tasks = [
    { title: "Zulu Task", status: "OPEN" as const },
    { title: "Alpha Task", status: "DONE" as const }
  ];
  const events = [
    buildEvent({
      title: "Evening Prayer",
      startsAt: new Date("2024-09-06T18:00:00.000Z"),
      endsAt: new Date("2024-09-06T19:00:00.000Z"),
      location: "Chapel"
    }),
    buildEvent({
      title: "Bible Study",
      startsAt: new Date("2024-09-05T18:00:00.000Z"),
      endsAt: new Date("2024-09-05T19:00:00.000Z")
    })
  ];

  const output = buildDigestSummary({ tasks, events });

  assert.equal(
    output,
    [
      "Tasks",
      "- [x] Alpha Task",
      "- [ ] Zulu Task",
      "",
      "Events",
      `- Bible Study · 2024-09-05T18:00:00.000Z → 2024-09-05T19:00:00.000Z`,
      `- Evening Prayer (Chapel) · 2024-09-06T18:00:00.000Z → 2024-09-06T19:00:00.000Z`
    ].join("\n")
  );
});

test("digest status transitions enforce publish rules", () => {
  assert.equal(transitionDigestStatus("DRAFT", "PUBLISHED"), "PUBLISHED");
  assert.equal(transitionDigestStatus("PUBLISHED", "PUBLISHED"), "PUBLISHED");

  assert.throws(
    () => transitionDigestStatus("PUBLISHED", "DRAFT"),
    /Cannot revert a published digest/
  );
});
