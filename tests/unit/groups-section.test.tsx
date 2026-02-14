import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GroupsSection from "@/components/this-week/parishioner/GroupsSection";
import { withI18n } from "@/tests/utils/i18n";

test("GroupsSection renders shared group row with message metadata", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(GroupsSection, {
        hasPublicGroups: true,
        groups: [
          {
            id: "group-1",
            name: "Care Team",
            avatarUrl: "/api/images/groups/group-1/avatar/test.jpg",
            description: "Helping neighbors",
            lastMessage: "See you Sunday",
            lastMessageAuthor: "Coordinator",
            lastMessageTime: new Date("2024-02-20T10:00:00.000Z"),
            unreadCount: 2
          }
        ]
      })
    )
  );

  assert.match(markup, /Care Team/);
  assert.match(markup, /Coordinator: See you Sunday/);
  assert.match(markup, /\/api\/images\/groups\/group-1\/avatar\/test.jpg/);
  assert.match(markup, />2</);
});
