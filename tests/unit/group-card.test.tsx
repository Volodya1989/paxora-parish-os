import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GroupCard from "@/components/groups/GroupCard";
import type { GroupListItem } from "@/lib/queries/groups";

const baseGroup: GroupListItem = {
  id: "group-1",
  name: "Hospitality Team",
  description: "Welcoming new members.",
  createdAt: new Date("2024-01-02T10:00:00.000Z"),
  archivedAt: null,
  visibility: "PUBLIC",
  joinPolicy: "OPEN",
  memberCount: 4,
  viewerMembershipStatus: null,
  viewerMembershipRole: null
};

test("GroupCard renders name, member count, and archive menu items", () => {
  const markup = renderToStaticMarkup(
    createElement(GroupCard, {
      group: baseGroup,
      canManageGroup: true,
      canManageMembers: true,
      onEdit: () => undefined,
      onArchive: () => undefined,
      onRestore: () => undefined,
      onManageMembers: () => undefined,
      onJoin: () => undefined,
      onRequestJoin: () => undefined,
      onLeave: () => undefined,
      forceMenuOpen: true
    })
  );

  assert.match(markup, /Hospitality Team/);
  assert.match(markup, /4 members/);
  assert.match(markup, />Edit</);
  assert.match(markup, />Archive</);
});

test("GroupCard shows restore option for archived groups", () => {
  const markup = renderToStaticMarkup(
    createElement(GroupCard, {
      group: { ...baseGroup, archivedAt: new Date("2024-02-10T10:00:00.000Z") },
      canManageGroup: true,
      canManageMembers: true,
      onEdit: () => undefined,
      onArchive: () => undefined,
      onRestore: () => undefined,
      onManageMembers: () => undefined,
      onJoin: () => undefined,
      onRequestJoin: () => undefined,
      onLeave: () => undefined,
      forceMenuOpen: true
    })
  );

  assert.match(markup, />Restore</);
});
