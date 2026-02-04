import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ThisWeekParishionerView from "@/components/this-week/ThisWeekParishionerView";
import { withI18n } from "@/tests/utils/i18n";

test("Parishioner view renders quick blocks and ordered sections", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(ThisWeekParishionerView, {
      data: {
        parishId: "parish-1",
        week: {
          id: "week-1",
          label: "2024-W36",
          startsOn: new Date("2024-09-02T00:00:00Z"),
          endsOn: new Date("2024-09-09T00:00:00Z")
        },
        tasks: [
          {
            id: "task-1",
            title: "Help setup chairs",
            status: "OPEN",
            dueBy: new Date("2024-09-05T09:00:00Z"),
            owner: { name: "Casey Rivera", initials: "CR" }
          },
          {
            id: "task-2",
            title: "Deliver meals",
            status: "OPEN",
            dueBy: new Date("2024-09-03T09:00:00Z"),
            owner: { name: "Jordan Lee", initials: "JL" }
          },
          {
            id: "task-3",
            title: "Call volunteers",
            status: "OPEN",
            dueBy: null,
            owner: { name: "Pat Singh", initials: "PS" }
          }
        ],
        events: [
          {
            id: "event-1",
            title: "Sunday Service",
            startsAt: new Date("2024-09-08T09:00:00Z"),
            endsAt: new Date("2024-09-08T10:00:00Z"),
            location: "Main Sanctuary"
          }
        ],
        announcements: [
          {
            id: "announcement-1",
            title: "Food drive update",
            updatedAt: new Date("2024-09-02T12:00:00Z"),
            createdAt: new Date("2024-09-01T12:00:00Z"),
            publishedAt: new Date("2024-09-02T12:00:00Z")
          }
        ],
        parishRole: "MEMBER",
        memberGroups: [
          { id: "group-1", name: "Choir", description: "Weekly rehearsal" }
        ],
        hasPublicGroups: true,
        stats: {
          tasksDone: 0,
          tasksTotal: 3,
          completionPct: 0
        },
        pendingTaskApprovals: 0,
        pendingAccessRequests: 0,
        pendingEventRequests: 0,
        canManageSpotlight: false,
        gratitudeSpotlight: {
          enabled: true,
          limit: 3,
          items: []
        }
      },
      weekSelection: "current",
      now: new Date("2024-09-03T12:00:00Z")
    })
    )
  );

  assert.match(markup, /Announcements/);
  assert.match(markup, /Services/);
  assert.match(markup, /Community/);
  assert.match(markup, /Opportunities to Help/);
  assert.match(markup, /href="\/tasks\?view=opportunities"/);

  const announcementsIndex = markup.indexOf("Announcements");
  const servicesIndex = markup.indexOf("Services");
  const communityIndex = markup.indexOf("Community");
  const opportunitiesIndex = markup.indexOf("Opportunities to Help");

  assert.ok(announcementsIndex < servicesIndex);
  assert.ok(servicesIndex < communityIndex);
  assert.ok(communityIndex < opportunitiesIndex);

  assert.match(markup, /Due by/);
  assert.doesNotMatch(markup, /Add event/);
  assert.doesNotMatch(markup, /Create announcement/);

  const deliverMealsIndex = markup.indexOf("Deliver meals");
  const helpSetupIndex = markup.indexOf("Help setup chairs");
  const callVolunteersIndex = markup.indexOf("Call volunteers");

  assert.ok(deliverMealsIndex < helpSetupIndex);
  assert.ok(helpSetupIndex < callVolunteersIndex);
});
