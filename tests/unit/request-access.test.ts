import { test } from "node:test";
import assert from "node:assert/strict";
import { canViewRequest } from "@/lib/requests/access";
import {
  isRequestOverdue,
  REQUEST_OVERDUE_STALE_DAYS,
  REQUEST_OVERDUE_SUBMITTED_HOURS
} from "@/lib/requests/utils";

test("request visibility respects roles and scopes", () => {
  const base = {
    viewerId: "viewer",
    createdByUserId: "creator",
    assignedToUserId: null,
    visibilityScope: "ADMIN_ALL" as const
  };

  assert.equal(
    canViewRequest({ ...base, viewerId: "creator", viewerRole: "MEMBER" }),
    true
  );

  assert.equal(
    canViewRequest({ ...base, viewerRole: "ADMIN", visibilityScope: "ADMIN_ALL" }),
    true
  );

  assert.equal(
    canViewRequest({ ...base, viewerRole: "ADMIN", visibilityScope: "CLERGY_ONLY" }),
    false
  );

  assert.equal(
    canViewRequest({
      ...base,
      viewerRole: "ADMIN",
      visibilityScope: "ADMIN_SPECIFIC",
      assignedToUserId: "viewer"
    }),
    true
  );

  assert.equal(
    canViewRequest({
      ...base,
      viewerRole: "MEMBER",
      visibilityScope: "ADMIN_SPECIFIC",
      assignedToUserId: "viewer"
    }),
    true
  );

  assert.equal(
    canViewRequest({
      ...base,
      viewerRole: "SHEPHERD",
      visibilityScope: "CLERGY_ONLY"
    }),
    true
  );
});

test("overdue logic flags stale requests", () => {
  const now = new Date("2025-01-10T12:00:00.000Z");
  const submittedOld = new Date(now.getTime() - (REQUEST_OVERDUE_SUBMITTED_HOURS + 1) * 60 * 60 * 1000);
  const submittedFresh = new Date(now.getTime() - (REQUEST_OVERDUE_SUBMITTED_HOURS - 1) * 60 * 60 * 1000);
  const staleUpdated = new Date(now.getTime() - (REQUEST_OVERDUE_STALE_DAYS + 1) * 24 * 60 * 60 * 1000);
  const freshUpdated = new Date(now.getTime() - (REQUEST_OVERDUE_STALE_DAYS - 1) * 24 * 60 * 60 * 1000);

  assert.equal(isRequestOverdue("SUBMITTED", submittedOld, submittedOld, now), true);
  assert.equal(isRequestOverdue("SUBMITTED", submittedFresh, submittedFresh, now), false);
  assert.equal(isRequestOverdue("ACKNOWLEDGED", submittedOld, staleUpdated, now), true);
  assert.equal(isRequestOverdue("SCHEDULED", submittedOld, freshUpdated, now), false);
  assert.equal(isRequestOverdue("COMPLETED", submittedOld, staleUpdated, now), false);
});
