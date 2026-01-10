import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GroupCard from "@/components/groups/GroupCard";

const baseGroup = {
  id: "group-1",
  name: "Hospitality Team",
  description: "Welcoming new members.",
  createdAt: new Date("2024-01-02T10:00:00.000Z"),
  archivedAt: null,
  memberCount: 4
};

test("GroupCard renders name, member count, and archive menu items", () => {
  const markup = renderToStaticMarkup(
    createElement(GroupCard, {
      group: baseGroup,
      onEdit: () => undefined,
      onArchive: () => undefined,
      onRestore: () => undefined,
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
      onEdit: () => undefined,
      onArchive: () => undefined,
      onRestore: () => undefined,
      forceMenuOpen: true
    })
  );

  assert.match(markup, />Restore</);
});
