import type { ReactNode } from "react";
import Link from "next/link";
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
import GratitudeSpotlightAdminSection from "@/components/this-week/admin/GratitudeSpotlightAdminSection";
import ParishionerHeader from "@/components/this-week/parishioner/ParishionerHeader";
import QuickBlocksRow from "@/components/this-week/parishioner/QuickBlocksRow";
import GroupsSection from "@/components/this-week/parishioner/GroupsSection";
import Badge from "@/components/ui/Badge";
import type { ThisWeekData, TaskPreview, EventPreview, AnnouncementPreview } from "@/lib/queries/this-week";
import { routes } from "@/lib/navigation/routes";
import {
  formatDayDate,
  formatShortDate,
  formatTime,
} from "@/lib/this-week/formatters";
import { getNow } from "@/lib/time/getNow";
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

/* ---------- lightweight inline icons ---------- */

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

/* ---------- card-style section row components (matching parishioner pages) ---------- */

function ServeRow({ item, t }: { item: TaskPreview; t: (key: string) => string }) {
  const statusTone = item.status === "DONE" ? "success" as const : item.status === "IN_PROGRESS" ? "warning" as const : "neutral" as const;
  const statusLabel = item.status === "DONE" ? "Completed" : item.status === "IN_PROGRESS" ? t("common.inProgress") : t("common.todo");
  const dueLabel = item.dueBy ? formatShortDate(item.dueBy) : null;

  return (
    <Link
      href={`${routes.serve}?taskId=${item.id}`}
      className="flex items-center gap-3 rounded-xl border border-mist-100 border-l-4 border-l-rose-400 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{item.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <Badge tone={statusTone} className="text-[10px]">{statusLabel}</Badge>
          {dueLabel && (
            <span className="flex items-center gap-0.5">
              <ClockIcon className="h-3 w-3" />
              {dueLabel}
            </span>
          )}
        </div>
      </div>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[10px] font-bold text-rose-600">
        {item.owner.initials}
      </span>
    </Link>
  );
}

function EventRow({ event }: { event: EventPreview }) {
  const dayLabel = event.startsAt.toLocaleDateString("en-US", { weekday: "short" });
  const timeLabel = formatTime(event.startsAt);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-mist-100 border-l-4 border-l-emerald-400 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
      <div className="flex shrink-0 flex-col items-center rounded-lg bg-emerald-50 px-2.5 py-1.5">
        <span className="text-xs font-bold uppercase text-emerald-700">{dayLabel}</span>
        <span className="text-xs font-semibold text-emerald-600">{timeLabel}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-ink-900">{event.title}</p>
        {event.location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
            <MapPinIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function AnnouncementRow({ item }: { item: AnnouncementPreview }) {
  const isPublished = Boolean(item.publishedAt);
  return (
    <Link
      href={`${routes.announcements}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-mist-100 border-l-4 border-l-amber-400 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
    >
      <p className="min-w-0 truncate text-sm font-semibold text-ink-900">{item.title}</p>
      <Badge tone={isPublished ? "success" : "warning"} className="shrink-0 text-[10px]">
        {isPublished ? "Live" : "Draft"}
      </Badge>
    </Link>
  );
}

/* ---------- section header ---------- */

function SectionHeader({ title, count, countLabel, href, linkLabel = "View all" }: {
  title: string;
  count: number;
  countLabel: string;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-700">{title}</h2>
        <span className="text-xs text-ink-400">{count} {countLabel}</span>
      </div>
      <Link href={href} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
        {linkLabel}
      </Link>
    </div>
  );
}

/* ---------- main component ---------- */

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
          title: `${data.pendingTaskApprovals} approval${data.pendingTaskApprovals === 1 ? "" : "s"} needed`,
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
          title: `${data.pendingAccessRequests} access request${data.pendingAccessRequests === 1 ? "" : "s"} pending`,
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
          title: `${data.pendingEventRequests} event request${data.pendingEventRequests === 1 ? "" : "s"} pending`,
          description: "Review calendar event requests awaiting approval.",
          actionHref: routes.calendar,
          actionLabel: "Review now",
          tone: "accent" as const,
          icon: <AlertCircleIcon className="h-4 w-4" />
        }
      : null
  ].filter((alert): alert is NonNullable<typeof alert> => Boolean(alert));

  // Compute quick-block data (same formula as parishioner view)
  const publishedAnnouncements = [...data.announcements]
    .filter((a) => a.publishedAt)
    .sort((a, b) => {
      const aDate = a.publishedAt ?? a.updatedAt;
      const bDate = b.publishedAt ?? b.updatedAt;
      return bDate.getTime() - aDate.getTime();
    });

  // Landing shows only non-completed tasks, prioritized by closest due date
  const activeTasks = [...data.tasks]
    .filter((t) => t.status !== "DONE")
    .sort((a, b) => {
      // OPEN before IN_PROGRESS (open items need attention first)
      if (a.status === "OPEN" && b.status !== "OPEN") return -1;
      if (a.status !== "OPEN" && b.status === "OPEN") return 1;
      // Within same status, closest due date first
      if (a.dueBy && b.dueBy) return a.dueBy.getTime() - b.dueBy.getTime();
      if (a.dueBy) return -1;
      if (b.dueBy) return 1;
      return a.title.localeCompare(b.title);
    });

  // Stats from ALL tasks (for quick-block summary)
  const tasksDone = data.tasks.filter((t) => t.status === "DONE").length;
  const tasksInProgress = data.tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const tasksOpen = data.tasks.filter((t) => t.status === "OPEN").length;

  // Filter events to today and future only
  const now = getNow();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcomingEvents = data.events.filter(
    (event) => event.startsAt >= startOfToday
  );

  const announcementsSummary =
    publishedAnnouncements.length > 0
      ? `Latest: ${publishedAnnouncements[0]?.title ?? "Parish update"}`
      : t("empty.noAnnouncements");
  const servicesSummary =
    upcomingEvents.length > 0
      ? `Next: ${formatDayDate(upcomingEvents[0].startsAt)}`
      : t("empty.nothingScheduled");
  const communitySummary =
    data.memberGroups.length > 0
      ? `${data.memberGroups.length} group${data.memberGroups.length === 1 ? "" : "s"} joined`
      : "Find your community";

  const opportunitiesSummary =
    data.tasks.length > 0
      ? `\u{1F7E2} ${tasksDone}  \u00B7  \u{1F7E1} ${tasksInProgress}  \u00B7  \u{1F535} ${tasksOpen}`
      : "Ways to help";

  const hasGratitudeItems =
    data.gratitudeSpotlight.enabled && data.gratitudeSpotlight.items.length > 0;

  const activeTaskCount = activeTasks.length;

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Warm hero header — shared with parishioner, with quick-add "+" for leaders */}
      <ParishionerHeader
        parishName={parishName}
        userName={userName}
        actions={viewToggle}
        showQuickAdd
        quote="Be watchful, stand firm in the faith, act like men, be strong."
        quoteSource="1 Corinthians 16:13"
      />

      {/* Quick blocks — identical to parishioner view */}
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
            count: upcomingEvents.length,
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
            count: data.tasks.length,
            icon: <HandHeartIcon className="h-4 w-4" />,
            accentClass: "border-rose-200 bg-rose-50/70 text-rose-700"
          }
        ]}
      />

      {/* Groups section — FIRST, just like parishioner view */}
      <GroupsSection
        groups={data.memberGroups}
        hasPublicGroups={data.hasPublicGroups}
      />

      {/* Admin alerts — compact, only when there are pending actions */}
      {alerts.length > 0 && <AdminAlertBanner alerts={alerts} />}

      {/* ──── Admin sections: borderless, compact ──── */}

      {/* Serve */}
      <section className="space-y-2">
        <SectionHeader
          title="Serve"
          count={activeTaskCount}
          countLabel="active"
          href={routes.serve}
        />
        {activeTasks.length > 0 ? (
          <div className="space-y-2">
            {activeTasks.slice(0, 3).map((item) => (
              <ServeRow key={item.id} item={item} t={t} />
            ))}
          </div>
        ) : (
          <Link
            href={`${routes.serve}?create=task`}
            className="flex items-center gap-3 rounded-xl border border-dashed border-rose-300 bg-rose-50/50 px-4 py-4 transition hover:border-rose-400 hover:bg-rose-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <HandHeartIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-800">Create a serve item</p>
              <p className="text-xs text-rose-600">Add tasks for your ministry team this week.</p>
            </div>
            <span className="text-sm text-rose-400">&rarr;</span>
          </Link>
        )}
        {activeTasks.length > 3 && (
          <Link href={routes.serve} className="block pt-1 text-center text-xs font-medium text-primary-600 hover:text-primary-700">
            +{activeTasks.length - 3} more
          </Link>
        )}
      </section>

      {/* Events */}
      <section className="space-y-2">
        <SectionHeader
          title="Events"
          count={upcomingEvents.length}
          countLabel="upcoming"
          href={routes.calendar}
        />
        {upcomingEvents.length > 0 ? (
          <div className="space-y-2">
            {upcomingEvents.slice(0, 3).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Link
            href={`${routes.calendar}?create=event`}
            className="flex items-center gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-4 transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-800">Schedule an event</p>
              <p className="text-xs text-emerald-600">Add services, rehearsals, or gatherings.</p>
            </div>
            <span className="text-sm text-emerald-400">&rarr;</span>
          </Link>
        )}
        {upcomingEvents.length > 3 && (
          <Link href={routes.calendar} className="block pt-1 text-center text-xs font-medium text-primary-600 hover:text-primary-700">
            +{upcomingEvents.length - 3} more
          </Link>
        )}
      </section>

      {/* Announcements */}
      <section className="space-y-2">
        <SectionHeader
          title="Announcements"
          count={data.announcements.length}
          countLabel={data.announcements.length === 1 ? "announcement" : "announcements"}
          href={routes.announcements}
        />
        {data.announcements.length > 0 ? (
          <div className="space-y-2">
            {data.announcements.slice(0, 3).map((item) => (
              <AnnouncementRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Link
            href={`${routes.announcements}/new`}
            className="flex items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-4 py-4 transition hover:border-amber-400 hover:bg-amber-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <MegaphoneIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-800">Create an announcement</p>
              <p className="text-xs text-amber-600">Share updates, news, or reminders with your parish.</p>
            </div>
            <span className="text-sm text-amber-400">&rarr;</span>
          </Link>
        )}
      </section>

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
