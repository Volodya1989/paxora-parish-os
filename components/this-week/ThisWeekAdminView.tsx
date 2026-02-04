import type { ReactNode } from "react";
import AdminAlertBanner, {
  AlertCircleIcon,
  UserPlusIcon
} from "@/components/this-week/admin/AdminAlertBanner";
import AnnouncementsPanel from "@/components/this-week/admin/AnnouncementsPanel";
import EventsPreviewCard from "@/components/this-week/admin/EventsPreviewCard";
import ServePreviewCard from "@/components/this-week/admin/ServePreviewCard";
import ThisWeekAdminHero from "@/components/this-week/admin/ThisWeekAdminHero";
import GratitudeSpotlightAdminSection from "@/components/this-week/admin/GratitudeSpotlightAdminSection";
import type { WeekOption } from "@/components/this-week/ThisWeekHeader";
import type { ThisWeekData } from "@/lib/queries/this-week";
import { routes } from "@/lib/navigation/routes";
import { formatUpdatedLabel } from "@/lib/this-week/formatters";

type ThisWeekAdminViewProps = {
  data: ThisWeekData;
  weekSelection: "previous" | "current" | "next";
  weekOptions: WeekOption[];
  dateRange: string;
  now: Date;
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
};

export default function ThisWeekAdminView({
  data,
  weekSelection,
  weekOptions,
  dateRange,
  now,
  viewToggle,
  spotlightAdmin
}: ThisWeekAdminViewProps) {
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

  return (
    <div className="section-gap">
      {alerts.length > 0 ? <AdminAlertBanner alerts={alerts} /> : null}

      <ThisWeekAdminHero
        weekLabel={data.week.label}
        dateRange={dateRange}
        updatedLabel={formatUpdatedLabel(now)}
        completedTasks={data.stats.tasksDone}
        totalTasks={data.stats.tasksTotal}
        completionPercentage={data.stats.completionPct}
        weekSelection={weekSelection}
        weekOptions={weekOptions}
        viewToggle={viewToggle}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ServePreviewCard items={data.tasks} />
        <EventsPreviewCard events={data.events} />
      </div>

      <AnnouncementsPanel announcements={data.announcements} />

      <div className="grid gap-6">
        <GratitudeSpotlightAdminSection
          weekId={data.week.id}
          spotlight={data.gratitudeSpotlight}
          admin={spotlightAdmin ?? null}
        />
      </div>
    </div>
  );
}
