import type { ReactNode } from "react";
import {
  CalendarIcon,
  HandHeartIcon,
  MegaphoneIcon,
  UsersIcon
} from "@/components/icons/ParishIcons";
import ParishionerHeader from "@/components/this-week/parishioner/ParishionerHeader";
import QuickBlocksRow from "@/components/this-week/parishioner/QuickBlocksRow";
import GroupsSection from "@/components/this-week/parishioner/GroupsSection";
import Card from "@/components/ui/Card";
import Link from "next/link";
import type { ThisWeekData } from "@/lib/queries/this-week";
import { routes } from "@/lib/navigation/routes";
import GratitudeSpotlightCard from "@/components/gratitude/GratitudeSpotlightCard";
import {
  formatDayDate,
  formatShortDate
} from "@/lib/this-week/formatters";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n/server";

type ThisWeekParishionerViewProps = {
  data: ThisWeekData;
  weekSelection: "previous" | "current" | "next";
  now: Date;
  viewToggle?: ReactNode;
  /** Parish name for the header (MVP default: Mother of God Ukrainian Catholic Church) */
  parishName?: string;
  /** User's first name for personalized greeting */
  userName?: string;
};

export default async function ThisWeekParishionerView({
  data,
  viewToggle,
  parishName = "Mother of God Ukrainian Catholic Church",
  userName
}: ThisWeekParishionerViewProps) {
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale);

  // Filter and sort announcements
  const publishedAnnouncements = [...data.announcements]
    .filter((announcement) => announcement.publishedAt)
    .sort((a, b) => {
      const aDate = a.publishedAt ?? a.updatedAt;
      const bDate = b.publishedAt ?? b.updatedAt;
      return bDate.getTime() - aDate.getTime();
    });

  // Sort tasks by due date
  const sortedTasks = [...data.tasks].sort((a, b) => {
    if (a.dueBy && b.dueBy) {
      return a.dueBy.getTime() - b.dueBy.getTime();
    }
    if (a.dueBy) return -1;
    if (b.dueBy) return 1;
    return a.title.localeCompare(b.title);
  });

  // Generate summaries for quick blocks
  const announcementsSummary =
    publishedAnnouncements.length > 0
      ? `Latest: ${publishedAnnouncements[0]?.title ?? "Parish update"}`
      : t("empty.noAnnouncements");
  const servicesSummary =
    data.events.length > 0
      ? `Next: ${formatDayDate(data.events[0].startsAt)}`
      : t("empty.nothingScheduled");
  const communitySummary =
    data.memberGroups.length > 0
      ? `${data.memberGroups.length} group${data.memberGroups.length === 1 ? "" : "s"} joined`
      : "Find your community";

  // Opportunities: count by status
  const tasksDone = sortedTasks.filter((t) => t.status === "DONE").length;
  const tasksInProgress = sortedTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const tasksOpen = sortedTasks.filter((t) => t.status === "OPEN").length;
  const opportunitiesSummary =
    sortedTasks.length > 0
      ? `🟢 ${tasksDone}  ·  🟡 ${tasksInProgress}  ·  🔵 ${tasksOpen}`
      : "Ways to help";

  // Check if gratitude spotlight has actual content
  const hasGratitudeItems = data.gratitudeSpotlight.enabled && data.gratitudeSpotlight.items.length > 0;

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Clean, welcoming header with personalized greeting */}
      <ParishionerHeader
        parishName={parishName}
        userName={userName}
        actions={viewToggle}
        quote="Teach us to number our days, that we may gain a heart of wisdom."
        quoteSource="Psalm 90:12"
      />

      {/* Hero Section: Four Main Action Tiles */}
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
            label: "Opportunities",
            href: `${routes.serve}?view=opportunities`,
            summary: opportunitiesSummary,
            count: sortedTasks.length,
            icon: <HandHeartIcon className="h-4 w-4" />,
            accentClass: "border-rose-200 bg-rose-50/70 text-rose-700"
          }
        ]}
      />

      {/* Admin approval notice (only if there are pending approvals) */}
      {data.pendingTaskApprovals > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-amber-200 bg-amber-50/70">
          <div className="space-y-0.5">
            <p className="font-medium text-amber-800">
              {data.pendingTaskApprovals} approval
              {data.pendingTaskApprovals === 1 ? "" : "s"} needed
            </p>
            <p className="text-sm text-amber-700">
              Review member-submitted serve items awaiting approval.
            </p>
          </div>
          <Link
            href={`${routes.serve}?view=opportunities`}
            className="rounded-button bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-300"
          >
            Review now
          </Link>
        </Card>
      )}

      {/* Your Groups / Chats — the only main content section */}
      <GroupsSection
        groups={data.memberGroups}
        hasPublicGroups={data.hasPublicGroups}
      />

      {/* Gratitude Spotlight - ONLY show if there are actual entries */}
      {hasGratitudeItems && (
        <GratitudeSpotlightCard
          enabled={data.gratitudeSpotlight.enabled}
          limit={data.gratitudeSpotlight.limit}
          items={data.gratitudeSpotlight.items}
          showCta
        />
      )}
    </div>
  );
}