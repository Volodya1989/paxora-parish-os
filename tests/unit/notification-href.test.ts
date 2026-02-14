import { test } from "node:test";
import assert from "node:assert/strict";
import { getSafeNotificationHref } from "@/lib/notifications/href";

test("getSafeNotificationHref keeps valid internal links", () => {
  assert.equal(getSafeNotificationHref("/admin/requests?requestId=abc"), "/admin/requests?requestId=abc");
  assert.equal(getSafeNotificationHref(" /tasks?pending=1 "), "/tasks?pending=1");
});

test("getSafeNotificationHref rejects malformed links", () => {
  assert.equal(getSafeNotificationHref(undefined), null);
  assert.equal(getSafeNotificationHref(""), null);
  assert.equal(getSafeNotificationHref("https://example.com"), null);
  assert.equal(getSafeNotificationHref("/admin/undefined"), null);
  assert.equal(getSafeNotificationHref("/requests/null?requestId=1"), null);
});
