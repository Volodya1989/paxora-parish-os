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
import { getTranslations } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { buildEventsSummary } from "@/lib/this-week/eventsSummary";

type ThisWeekParishionerViewProps = {
  data: ThisWeekData;
  locale: Locale;
  weekSelection: "previous" | "current" | "next";
  now: Date;
  viewToggle?: ReactNode;
  /** Parish name for the header */
  parishName?: string;
  /** Optional parish logo URL (falls back to Paxora logo) */
  parishLogoUrl?: string | null;
  /** User's first name for personalized greeting */
  userName?: string;
  startGuide?: ReactNode;
};

export default function ThisWeekParishionerView({
  data,
  locale,
  viewToggle,
  startGuide,
  parishName,
  parishLogoUrl,
  userName,
  now
}: ThisWeekParishionerViewProps) {
  const t = getTranslations(locale);

  const resolvedParishName = parishName || t("serve.myParish");

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

  // Filter events to future only
  const upcomingEvents = data.events.filter((event) => event.startsAt >= now);

  // Generate summaries for quick blocks
  const announcementsSummary =
    publishedAnnouncements.length > 0
      ? publishedAnnouncements[0]?.title ?? t("thisWeek.announcements")
      : t("thisWeek.allRead");
  const servicesSummary = buildEventsSummary({ events: data.events, locale, now, t });
  const communitySummary = getJoinedGroupsSummary({ count: data.memberGroups.length, locale, t });

  // Opportunities: count by status
  const tasksDone = sortedTasks.filter((tk) => tk.status === "DONE").length;
  const tasksInProgress = sortedTasks.filter((tk) => tk.status === "IN_PROGRESS").length;
  const tasksOpen = sortedTasks.filter((tk) => tk.status === "OPEN").length;
  const opportunitiesSummary =
    sortedTasks.length > 0
      ? `🟢 ${tasksDone}  ·  🟡 ${tasksInProgress}  ·  🔵 ${tasksOpen}`
      : t("thisWeek.waysToHelp");

  // Check if gratitude spotlight has actual content
  const hasGratitudeItems = data.gratitudeSpotlight.enabled && data.gratitudeSpotlight.items.length > 0;

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Clean, welcoming header with personalized greeting */}
      <ParishionerHeader
        parishName={resolvedParishName}
        parishLogoUrl={parishLogoUrl}
        userName={userName}
        actions={viewToggle}
        quote={t("thisWeek.quote")}
        quoteSource={t("thisWeek.quoteSource")}
      />

      {startGuide}

      {/* Hero Section: Four Main Action Tiles */}
      <QuickBlocksRow
        blocks={[
          {
            id: "announcements",
            label: t("thisWeek.announcements"),
            href: routes.announcements,
            summary: announcementsSummary,
            count: publishedAnnouncements.length,
            icon: <MegaphoneIcon className="h-4 w-4" />,
            accentClass: "border-amber-200 bg-amber-50/70 text-amber-700"
          },
          {
            id: "services",
            label: t("thisWeek.services"),
            href: routes.calendar,
            summary: servicesSummary,
            count: upcomingEvents.length,
            icon: <CalendarIcon className="h-4 w-4" />,
            accentClass: "border-emerald-200 bg-emerald-50/70 text-emerald-700"
          },
          {
            id: "community",
            label: t("thisWeek.community"),
            href: routes.groups,
            summary: communitySummary,
            count: data.memberGroups.length,
            icon: <UsersIcon className="h-4 w-4" />,
            accentClass: "border-sky-200 bg-sky-50/70 text-sky-700"
          },
          {
            id: "opportunities",
            label: t("thisWeek.opportunities"),
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
              {data.pendingTaskApprovals === 1
                ? t("thisWeek.approvalsNeeded").replace("{count}", "1")
                : t("thisWeek.approvalsNeededPlural").replace("{count}", String(data.pendingTaskApprovals))}
            </p>
            <p className="text-sm text-amber-700">
              {t("thisWeek.reviewApprovals")}
            </p>
          </div>
          <Link
            href={buildLocalePathname(locale, `${routes.serve}?view=opportunities`)}
            className="rounded-button bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-300"
          >
            {t("thisWeek.reviewNow")}
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

function getJoinedGroupsSummary({
  count,
  locale,
  t
}: {
  count: number;
  locale: Locale;
  t: (key: string) => string;
}) {
  if (count <= 0) {
    return t("thisWeek.findCommunity");
  }

  if (locale === "uk") {
    const mod10 = count % 10;
    const mod100 = count % 100;
    const suffix =
      mod10 === 1 && mod100 !== 11
        ? t("thisWeek.groupsJoinedOne")
        : mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)
          ? t("thisWeek.groupsJoinedFew")
          : t("thisWeek.groupsJoinedMany");
    return `${count} ${suffix}`;
  }

  return `${count} ${count === 1 ? t("thisWeek.groupsJoinedOne") : t("thisWeek.groupsJoinedMany")}`;
}
