import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildStartThisWeekStorageKey,
  getStartThisWeekItems
} from "@/lib/onboarding/startThisWeek";

test("member start-this-week checklist includes five pilot actions", () => {
  const items = getStartThisWeekItems("MEMBER");

  assert.equal(items.length, 5);
  assert.deepEqual(
    items.map((item) => item.href),
    ["/announcements", "/calendar", "/groups", "/tasks", "/requests"]
  );
});

test("admin and shepherd checklists include leadership actions", () => {
  const adminItems = getStartThisWeekItems("ADMIN");
  const shepherdItems = getStartThisWeekItems("SHEPHERD");

  assert.equal(adminItems.length, 3);
  assert.deepEqual(adminItems, shepherdItems);
  assert.deepEqual(
    adminItems.map((item) => item.href),
    ["/announcements", "/calendar", "/admin/requests"]
  );
});

test("storage key is scoped by user, parish, and role", () => {
  const memberKey = buildStartThisWeekStorageKey({
    userId: "user_1",
    parishId: "parish_1",
    role: "MEMBER"
  });

  const adminKey = buildStartThisWeekStorageKey({
    userId: "user_1",
    parishId: "parish_1",
    role: "ADMIN"
  });

  assert.notEqual(memberKey, adminKey);
  assert.equal(memberKey, "start-this-week:user_1:parish_1:MEMBER:v1");
});
