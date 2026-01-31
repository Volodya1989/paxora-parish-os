import type { ReactNode } from "react";
import {
  CalendarIcon,
  HandHeartIcon,
  MegaphoneIcon,
  UsersIcon
} from "@/components/icons/ParishIcons";
import ThisWeekHeader, { type WeekOption } from "@/components/this-week/ThisWeekHeader";
import QuickBlocksRow from "@/components/this-week/parishioner/QuickBlocksRow";
import ParishHubPreview from "@/components/this-week/parishioner/ParishHubPreview";
import SectionAnnouncements from "@/components/this-week/parishioner/SectionAnnouncements";
import SectionSchedule from "@/components/this-week/parishioner/SectionSchedule";
import SectionCommunity from "@/components/this-week/parishioner/SectionCommunity";
import SectionOpportunities from "@/components/this-week/parishioner/SectionOpportunities";
import Card from "@/components/ui/Card";
import Link from "next/link";
import type { ThisWeekData } from "@/lib/queries/this-week";
import { routes } from "@/lib/navigation/routes";
import GratitudeSpotlightCard from "@/components/gratitude/GratitudeSpotlightCard";
import {
  formatDateRange,
  formatDayDate,
  formatShortDate,
  formatUpdatedLabel
} from "@/lib/this-week/formatters";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n/server";

type HubItemPreview = {
  id: string;
  label: string;
  icon: "BULLETIN" | "MASS_TIMES" | "CONFESSION" | "WEBSITE" | "CALENDAR" | "READINGS" | "GIVING" | "CONTACT" | "FACEBOOK" | "YOUTUBE" | "PRAYER" | "NEWS";
  targetType: "EXTERNAL" | "INTERNAL";
  targetUrl: string | null;
  internalRoute: string | null;
};

type ThisWeekParishionerViewProps = {
  data: ThisWeekData;
  weekSelection: "previous" | "current" | "next";
  weekOptions: WeekOption[];
  now: Date;
  viewToggle?: ReactNode;
  hubItems?: HubItemPreview[];
};

export default async function ThisWeekParishionerView({
  data,
  weekSelection,
  weekOptions,
  now,
  viewToggle,
  hubItems = []
}: ThisWeekParishionerViewProps) {
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale);
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
      : t("empty.nothingScheduled");
  const communitySummary =
    data.memberGroups.length > 0
      ? `${data.memberGroups.length} group${data.memberGroups.length === 1 ? "" : "s"}`
      : "Find a community";
  const opportunitiesSummary =
    sortedTasks.length > 0 && sortedTasks[0]?.dueBy
      ? `Due by ${formatShortDate(sortedTasks[0].dueBy)}`
      : "New opportunities";

  return (
    <div className="space-y-4 overflow-x-hidden">
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
        variant="compact"
        viewToggle={viewToggle}
      />

{/* A-016: Gratitude board entry point. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-mist-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Hours & Gratitude Board</p>
          <p className="text-xs text-ink-500">See this week's gratitude and hours offered.</p>
        </div>
        <Link
          href={routes.gratitudeBoard}
          className="text-xs font-semibold text-primary-700 underline"
        >
          View Gratitude Board
        </Link>
      </div>

      {/* Parish Hub quick access */}
      {hubItems.length > 0 && <ParishHubPreview items={hubItems} maxVisible={6} />}

      {data.pendingTaskApprovals > 0 ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50/70">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {data.pendingTaskApprovals} approval
              {data.pendingTaskApprovals === 1 ? "" : "s"} needed
            </p>
            <p className="text-xs text-amber-700">
              Review member-submitted serve items awaiting approval.
            </p>
          </div>
          <Link
            href={`${routes.serve}?view=opportunities`}
            className="text-sm font-semibold text-amber-800 underline"
          >
            Review now
          </Link>
        </Card>
      ) : null}

      <QuickBlocksRow
        blocks={[
          {
            id: "announcements",
            label: "Announcements",
            href: routes.announcements,
            summary: announcementsSummary,
            count: publishedAnnouncements.length,
            icon: <MegaphoneIcon className="h-4 w-4" />,
            accentClass: "border-amber-200 bg-amber-50/70 text-amber-700"
          },
          {
            id: "services",
            label: "Services",
            href: routes.calendar,
            summary: servicesSummary,
            count: data.events.length,
            icon: <CalendarIcon className="h-4 w-4" />,
            accentClass: "border-emerald-200 bg-emerald-50/70 text-emerald-700"
          },
          {
            id: "community",
            label: "Community",
            href: routes.groups,
            summary: communitySummary,
            count: data.memberGroups.length,
            icon: <UsersIcon className="h-4 w-4" />,
            accentClass: "border-sky-200 bg-sky-50/70 text-sky-700"
          },
          {
            id: "opportunities",
            label: "Opportunities to Help",
            href: `${routes.serve}?view=opportunities`,
            summary: opportunitiesSummary,
            count: sortedTasks.length,
            icon: <HandHeartIcon className="h-4 w-4" />,
            accentClass: "border-rose-200 bg-rose-50/70 text-rose-700"
          }
        ]}
      />

      {/* A-016: Weekly gratitude spotlight. */}
      <GratitudeSpotlightCard
        enabled={data.gratitudeSpotlight.enabled}
        limit={data.gratitudeSpotlight.limit}
        items={data.gratitudeSpotlight.items}
      />

      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <div className="space-y-5 lg:space-y-6">
          <SectionAnnouncements announcements={publishedAnnouncements} />
          <SectionSchedule events={data.events} />
        </div>
        <div className="space-y-5 lg:space-y-6">
          <SectionCommunity groups={data.memberGroups} hasPublicGroups={data.hasPublicGroups} />
          <SectionOpportunities tasks={sortedTasks} />
        </div>
      </div>
    </div>
  );
}
