import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRequestTimeline, type RequestDetails } from "@/lib/requests/details";

test("buildRequestTimeline merges and sorts request activity + email history", () => {
  const details: RequestDetails = {
    history: [
      {
        sentAt: "2026-01-02T10:00:00.000Z",
        type: "NEED_MORE_INFO",
        subject: "Need more information",
        sentByName: "Fr. Michael",
        note: "Please share the best callback time."
      }
    ],
    activity: [
      {
        occurredAt: "2026-01-03T09:00:00.000Z",
        type: "STATUS",
        actorId: "u1",
        actorName: "Parish Admin",
        description: "Status changed from Submitted to Acknowledged."
      }
    ]
  };

  const timeline = buildRequestTimeline(details);

  assert.equal(timeline.length, 2);
  assert.equal(timeline[0]?.title, "Status changed from Submitted to Acknowledged.");
  assert.equal(timeline[1]?.title, "Need more information");
  assert.match(timeline[1]?.meta ?? "", /sent by fr\. michael/i);
});

test("buildRequestTimeline returns empty list when details are absent", () => {
  assert.deepEqual(buildRequestTimeline(null), []);
});
