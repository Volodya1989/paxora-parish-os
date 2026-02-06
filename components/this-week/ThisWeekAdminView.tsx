import type { ReactNode } from "react";
import {
  CalendarIcon,
  HandHeartIcon,
  MegaphoneIcon,
  UsersIcon
} from "@/components/icons/ParishIcons";
import AdminAlertBanner, {
  AlertCircleIcon,
  UserPlusIcon
} from "@/components/this-week/admin/AdminAlertBanner";
import AnnouncementsPanel from "@/components/this-week/admin/AnnouncementsPanel";
import EventsPreviewCard from "@/components/this-week/admin/EventsPreviewCard";
import ServePreviewCard from "@/components/this-week/admin/ServePreviewCard";
import GratitudeSpotlightAdminSection from "@/components/this-week/admin/GratitudeSpotlightAdminSection";
import ParishionerHeader from "@/components/this-week/parishioner/ParishionerHeader";
import QuickBlocksRow from "@/components/this-week/parishioner/QuickBlocksRow";
import GroupsSection from "@/components/this-week/parishioner/GroupsSection";
import type { ThisWeekData } from "@/lib/queries/this-week";
import { routes } from "@/lib/navigation/routes";
import {
  formatDayDate,
} from "@/lib/this-week/formatters";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n/server";

type ThisWeekAdminViewProps = {
  data: ThisWeekData;
  viewToggle?: ReactNode;
  spotlightAdmin?: {
    settings: {
      enabled: boolean;
      limit: number;
    };
    nominations: Array<{
      id: string;
      reason: string;
      status: "DRAFT" | "PUBLISHED";
      nominee: { id: string; name: string };
    }>;
    memberOptions: Array<{ id: string; name: string; label?: string }>;
  } | null;
  parishName?: string;
  userName?: string;
};

export default async function ThisWeekAdminView({
  data,
  viewToggle,
  spotlightAdmin,
  parishName = "Mother of God Ukrainian Catholic Church",
  userName
}: ThisWeekAdminViewProps) {
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale);

  // Build alerts for pending admin actions
  const alerts = [
    data.pendingTaskApprovals > 0
      ? {
          id: "task-approvals",
          title: `${data.pendingTaskApprovals} approval${
            data.pendingTaskApprovals === 1 ? "" : "s"
          } needed`,
          description: "Review member-submitted serve items awaiting approval.",
          actionHref: `${routes.serve}?view=opportunities`,
          actionLabel: "Review now",
          tone: "accent" as const,
          icon: <AlertCircleIcon className="h-4 w-4" />
        }
      : null,
    data.pendingAccessRequests > 0
      ? {
          id: "access-requests",
          title: `${data.pendingAccessRequests} access request${
            data.pendingAccessRequests === 1 ? "" : "s"
          } pending`,
          description: "Review parish access requests waiting for approval.",
          actionHref: routes.serve,
          actionLabel: "Review now",
          tone: "info" as const,
          icon: <UserPlusIcon className="h-4 w-4" />
        }
      : null,
    data.pendingEventRequests > 0
      ? {
          id: "event-requests",
          title: `${data.pendingEventRequests} event request${
            data.pendingEventRequests === 1 ? "" : "s"
          } pending`,
          description: "Review calendar event requests awaiting approval.",
          actionHref: routes.calendar,
          actionLabel: "Review now",
          tone: "accent" as const,
          icon: <AlertCircleIcon className="h-4 w-4" />
        }
      : null
  ].filter((alert): alert is NonNullable<typeof alert> => Boolean(alert));

  // Compute same quick-block data as parishioner view
  const publishedAnnouncements = [...data.announcements]
    .filter((a) => a.publishedAt)
    .sort((a, b) => {
      const aDate = a.publishedAt ?? a.updatedAt;
      const bDate = b.publishedAt ?? b.updatedAt;
      return bDate.getTime() - aDate.getTime();
    });

  const sortedTasks = [...data.tasks].sort((a, b) => {
    if (a.dueBy && b.dueBy) return a.dueBy.getTime() - b.dueBy.getTime();
    if (a.dueBy) return -1;
    if (b.dueBy) return 1;
    return a.title.localeCompare(b.title);
  });

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

  const tasksDone = sortedTasks.filter((t) => t.status === "DONE").length;
  const tasksInProgress = sortedTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const tasksOpen = sortedTasks.filter((t) => t.status === "OPEN").length;
  const opportunitiesSummary =
    sortedTasks.length > 0
      ? `Done ${tasksDone} · Active ${tasksInProgress} · Open ${tasksOpen}`
      : "Ways to help";

  const hasGratitudeItems =
    data.gratitudeSpotlight.enabled && data.gratitudeSpotlight.items.length > 0;

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Same warm header as parishioner — with view toggle in actions */}
      <ParishionerHeader
        parishName={parishName}
        userName={userName}
        actions={viewToggle}
        quote="Teach us to number our days, that we may gain a heart of wisdom."
        quoteSource="Psalm 90:12"
      />

      {/* Same quick blocks as parishioner — same visual language */}
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

      {/* Admin alerts — only when there are pending actions */}
      {alerts.length > 0 && <AdminAlertBanner alerts={alerts} />}

      {/* Admin content sections: serve + events side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ServePreviewCard items={data.tasks} />
        <EventsPreviewCard events={data.events} />
      </div>

      <AnnouncementsPanel announcements={data.announcements} />

      {/* Groups section — same as parishioner view */}
      <GroupsSection
        groups={data.memberGroups}
        hasPublicGroups={data.hasPublicGroups}
      />

      {/* Gratitude spotlight (admin can manage nominations) */}
      {(hasGratitudeItems || spotlightAdmin) && (
        <GratitudeSpotlightAdminSection
          weekId={data.week.id}
          spotlight={data.gratitudeSpotlight}
          admin={spotlightAdmin ?? null}
        />
      )}
    </div>
  );
}
