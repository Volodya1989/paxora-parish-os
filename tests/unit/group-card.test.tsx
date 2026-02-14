import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GroupCard from "@/components/groups/GroupCard";
import type { GroupListItem } from "@/lib/queries/groups";
import { withI18n } from "@/tests/utils/i18n";

const baseGroup: GroupListItem = {
  id: "group-1",
  createdById: "user-1",
  name: "Hospitality Team",
  avatarUrl: null,
  description: "Welcoming new members.",
  createdAt: new Date("2024-01-02T10:00:00.000Z"),
  archivedAt: null,
  status: "ACTIVE",
  visibility: "PUBLIC",
  joinPolicy: "OPEN",
  createdBy: { name: "Alex Kim", email: "alex@example.com" },
  memberCount: 4,
  viewerMembershipStatus: null,
  viewerMembershipRole: null,
  unreadCount: 0
};

test("GroupCard renders name and archive menu items", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(GroupCard, {
        group: baseGroup,
        canManageGroup: true,
        canManageMembers: true,
        onEdit: () => undefined,
        onArchive: () => undefined,
        onRestore: () => undefined,
        onDelete: () => undefined,
        onManageMembers: () => undefined,
        onJoin: () => undefined,
        onRequestJoin: () => undefined,
        onLeave: () => undefined,
        onAcceptInvite: () => undefined,
        onDeclineInvite: () => undefined,
        forceMenuOpen: true
      })
    )
  );

  assert.match(markup, /Hospitality Team/);
  assert.match(markup, />Edit</);
  assert.match(markup, />Archive</);
});

test("GroupCard shows restore option for archived groups", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(GroupCard, {
        group: { ...baseGroup, archivedAt: new Date("2024-02-10T10:00:00.000Z") },
        canManageGroup: true,
        canManageMembers: true,
        onEdit: () => undefined,
        onArchive: () => undefined,
        onRestore: () => undefined,
        onDelete: () => undefined,
        onManageMembers: () => undefined,
        onJoin: () => undefined,
        onRequestJoin: () => undefined,
        onLeave: () => undefined,
        onAcceptInvite: () => undefined,
        onDeclineInvite: () => undefined,
        forceMenuOpen: true
      })
    )
  );

  assert.match(markup, />Restore</);
});

test("GroupCard shows unread badge when available", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(GroupCard, {
        group: { ...baseGroup, unreadCount: 3, viewerMembershipStatus: "ACTIVE" },
        canManageGroup: false,
        canManageMembers: false,
        onEdit: () => undefined,
        onArchive: () => undefined,
        onRestore: () => undefined,
        onDelete: () => undefined,
        onManageMembers: () => undefined,
        onJoin: () => undefined,
        onRequestJoin: () => undefined,
        onLeave: () => undefined,
        onAcceptInvite: () => undefined,
        onDeclineInvite: () => undefined
      })
    )
  );

  assert.match(markup, />3</);
});

test("GroupCard shows join action for non-members", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(GroupCard, {
        group: { ...baseGroup, viewerMembershipStatus: null },
        canManageGroup: false,
        canManageMembers: false,
        onEdit: () => undefined,
        onArchive: () => undefined,
        onRestore: () => undefined,
        onDelete: () => undefined,
        onManageMembers: () => undefined,
        onJoin: () => undefined,
        onRequestJoin: () => undefined,
        onLeave: () => undefined,
        onAcceptInvite: () => undefined,
        onDeclineInvite: () => undefined
      })
    )
  );

  assert.match(markup, /Join/);
});
