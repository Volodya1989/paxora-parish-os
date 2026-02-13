import { test } from "node:test";
import assert from "node:assert/strict";
import { countUnreadItems } from "@/components/notifications/unreadCount";

test("countUnreadItems returns 0 when all notifications are read", () => {
  const count = countUnreadItems([
    {
      id: "n1",
      type: "message",
      title: "t",
      description: "d",
      href: "/x",
      timestamp: new Date().toISOString(),
      readAt: new Date().toISOString()
    },
    {
      id: "n2",
      type: "task",
      title: "t",
      description: "d",
      href: "/x",
      timestamp: new Date().toISOString(),
      readAt: new Date().toISOString()
    }
  ]);

  assert.equal(count, 0);
});
