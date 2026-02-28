import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AnnouncementRow from "@/components/announcements/AnnouncementRow";
import type { AnnouncementListItem } from "@/lib/queries/announcements";
import { withI18n } from "@/tests/utils/i18n";

const baseAnnouncement: AnnouncementListItem = {
  id: "announcement-1",
  title: "Community picnic this Sunday",
  body: "Bring a blanket and something to share after the 10am service.",
  bodyHtml: null,
  bodyText: null,
  createdAt: new Date("2024-03-10T10:00:00.000Z"),
  updatedAt: new Date("2024-03-11T12:00:00.000Z"),
  publishedAt: null,
  scopeType: "PARISH",
  chatChannelId: null,
  chatChannelName: null,
  archivedAt: null,
  reactions: [],
  commentsCount: 0,
  createdBy: {
    id: "user-1",
    name: "St. Anne Office"
  }
};

test("AnnouncementRow renders title, status chip, and actions", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(AnnouncementRow, {
        announcement: baseAnnouncement,
        onTogglePublish: () => undefined,
        onArchive: () => undefined,
        currentUserId: "user-1",
        canModerateComments: false
      })
    )
  );

  assert.match(markup, /Community picnic this Sunday/);
  assert.match(markup, /Bring a blanket and something to share/);
  assert.match(markup, /St\. Anne Office/);
  assert.match(markup, />Draft</);
  assert.match(markup, /aria-label="Publish announcement"/);
  assert.match(markup, /aria-label="Announcement actions"/);
});

test("AnnouncementRow includes publish toggle for drafts", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(AnnouncementRow, {
        announcement: baseAnnouncement,
        onTogglePublish: () => undefined,
        onArchive: () => undefined,
        currentUserId: "user-1",
        canModerateComments: false
      })
    )
  );

  assert.match(markup, /aria-label="Publish announcement"/);
});
