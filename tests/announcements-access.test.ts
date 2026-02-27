import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAnnouncementVisibilityWhere } from "@/lib/announcements/access";

test("announcement visibility requires parish membership", () => {
  const where = buildAnnouncementVisibilityWhere({
    parishId: "parish-1",
    userId: "user-1",
    status: "published"
  });

  assert.deepEqual(where.parish, {
    memberships: {
      some: {
        userId: "user-1"
      }
    }
  });
});
