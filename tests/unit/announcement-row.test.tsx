import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AnnouncementRow from "@/components/announcements/AnnouncementRow";
import type { AnnouncementListItem } from "@/lib/queries/announcements";

const baseAnnouncement: AnnouncementListItem = {
  id: "announcement-1",
  title: "Community picnic this Sunday",
  createdAt: new Date("2024-03-10T10:00:00.000Z"),
  updatedAt: new Date("2024-03-11T12:00:00.000Z"),
  publishedAt: null,
  archivedAt: null
};

function findElementByAriaLabel(
  element: ReactElement,
  label: string
): ReactElement | null {
  if (element.props?.["aria-label"] === label) {
    return element;
  }

  const children = element.props?.children;
  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child || typeof child !== "object") {
      continue;
    }
    const found = findElementByAriaLabel(child as ReactElement, label);
    if (found) {
      return found;
    }
  }

  return null;
}

test("AnnouncementRow renders title, status chip, and actions", () => {
  const markup = renderToStaticMarkup(
    createElement(AnnouncementRow, {
      announcement: baseAnnouncement,
      onTogglePublish: () => undefined,
      onArchive: () => undefined
    })
  );

  assert.match(markup, /Community picnic this Sunday/);
  assert.match(markup, />Draft</);
  assert.match(markup, /aria-label="Publish announcement"/);
  assert.match(markup, /aria-label="Announcement actions"/);
});

test("AnnouncementRow toggle calls handler", () => {
  let called = false;

  const element = AnnouncementRow({
    announcement: baseAnnouncement,
    onTogglePublish: (_id, nextPublished) => {
      called = true;
      assert.equal(nextPublished, true);
    },
    onArchive: () => undefined
  }) as ReactElement;

  const toggle = findElementByAriaLabel(element, "Publish announcement");
  assert.ok(toggle, "Expected publish toggle button");

  toggle?.props.onClick?.();

  assert.equal(called, true);
});
