import type { ReactNode } from "react";
import ThisWeekHeader, { type WeekOption } from "@/components/this-week/ThisWeekHeader";
import QuickBlocksRow from "@/components/this-week/parishioner/QuickBlocksRow";
import SectionAnnouncements from "@/components/this-week/parishioner/SectionAnnouncements";
import SectionSchedule from "@/components/this-week/parishioner/SectionSchedule";
import SectionCommunity from "@/components/this-week/parishioner/SectionCommunity";
import SectionOpportunities from "@/components/this-week/parishioner/SectionOpportunities";
import type { ThisWeekData } from "@/lib/queries/this-week";
import { formatDateRange, formatDayDate, formatShortDate, formatUpdatedLabel } from "@/lib/this-week/formatters";

type ThisWeekParishionerViewProps = {
  data: ThisWeekData;
  weekSelection: "previous" | "current" | "next";
  weekOptions: WeekOption[];
  now: Date;
  viewToggle?: ReactNode;
};

export default function ThisWeekParishionerView({
  data,
  weekSelection,
  weekOptions,
  now,
  viewToggle
}: ThisWeekParishionerViewProps) {
  const publishedAnnouncements = [...data.announcements]
    .filter((announcement) => announcement.publishedAt)
    .sort((a, b) => {
      const aDate = a.publishedAt ?? a.updatedAt;
      const bDate = b.publishedAt ?? b.updatedAt;
      return bDate.getTime() - aDate.getTime();
    });

  const sortedTasks = [...data.tasks].sort((a, b) => {
    if (a.dueBy && b.dueBy) {
      return a.dueBy.getTime() - b.dueBy.getTime();
    }
    if (a.dueBy) return -1;
    if (b.dueBy) return 1;
    return a.title.localeCompare(b.title);
  });

  const announcementsSummary =
    publishedAnnouncements.length > 0
      ? `Latest: ${publishedAnnouncements[0]?.title ?? "Parish update"}`
      : "No new updates";
  const servicesSummary =
    data.events.length > 0
      ? `Next: ${formatDayDate(data.events[0].startsAt)}`
      : "Nothing scheduled yet";
  const communitySummary =
    data.memberGroups.length > 0
      ? `${data.memberGroups.length} group${data.memberGroups.length === 1 ? "" : "s"}`
      : "Find a community";
  const opportunitiesSummary =
    sortedTasks.length > 0 && sortedTasks[0]?.dueBy
      ? `Due by ${formatShortDate(sortedTasks[0].dueBy)}`
      : "New opportunities";

  return (
    <div className="section-gap">
      <ThisWeekHeader
        title="This Week"
        weekLabel={data.week.label}
        dateRange={formatDateRange(data.week.startsOn, data.week.endsOn)}
        updatedLabel={formatUpdatedLabel(now)}
        completionLabel={`${data.stats.tasksDone}/${data.stats.tasksTotal} done`}
        completionPct={data.stats.completionPct}
        weekSelection={weekSelection}
        weekOptions={weekOptions}
        showCompletion={false}
        showQuickAdd={false}
        viewToggle={viewToggle}
      />

      <QuickBlocksRow
        blocks={[
          {
            id: "announcements",
            label: "Announcements",
            href: "#announcements",
            summary: announcementsSummary
          },
          {
            id: "services",
            label: "Services",
            href: "#services",
            summary: servicesSummary
          },
          {
            id: "community",
            label: "Community",
            href: "#community",
            summary: communitySummary
          },
          {
            id: "opportunities",
            label: "Opportunities to Help",
            href: "/tasks?view=opportunities",
            summary: opportunitiesSummary
          }
        ]}
      />

      <div className="space-y-5">
        <SectionAnnouncements announcements={publishedAnnouncements} />
        <SectionSchedule events={data.events} />
        <SectionCommunity groups={data.memberGroups} hasPublicGroups={data.hasPublicGroups} />
        <SectionOpportunities tasks={sortedTasks} />
      </div>
    </div>
  );
}
