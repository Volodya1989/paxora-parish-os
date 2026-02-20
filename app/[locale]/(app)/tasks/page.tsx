import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getParishMembership, listTaskFilterGroups } from "@/server/db/groups";
import { getWeekForSelection, parseWeekSelection } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { listMyPendingTaskRequests, listPendingTaskApprovals, listTasks, type TaskFilters } from "@/lib/queries/tasks";
import { getPendingAccessRequests } from "@/lib/queries/access";
import { getUserYtdHours } from "@/lib/queries/hours";
import { getMilestoneTier } from "@/lib/hours/milestones";
import { approveParishAccess, rejectParishAccess } from "@/app/actions/access";
import TasksView from "@/components/tasks/TasksView";
import { getTasksViewMode } from "@/lib/tasks/viewMode";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import VolunteerHoursSummary from "@/components/serve-board/VolunteerHoursSummary";
import { canAccessServeBoard, isParishLeader } from "@/lib/permissions";
import { HandHeartIcon } from "@/components/icons/ParishIcons";
import { getTranslator } from "@/lib/i18n/translator";
import { getLocaleFromParam } from "@/lib/i18n/routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TaskSearchParams = {
  week?: string | string[];
  status?: string | string[];
  owner?: string | string[];
  group?: string | string[];
  q?: string | string[];
  dateFrom?: string | string[];
  dateTo?: string | string[];
  view?: string | string[];
  create?: string;
};

function resolveParam(param?: string | string[]) {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

function parseTaskFilters(
  searchParams?: TaskSearchParams,
  viewMode?: "all" | "opportunities" | "mine"
): TaskFilters {
  const status = resolveParam(searchParams?.status);
  const owner = resolveParam(searchParams?.owner);
  const group = resolveParam(searchParams?.group);
  const query = resolveParam(searchParams?.q);
  const dateFrom = resolveParam(searchParams?.dateFrom);
  const dateTo = resolveParam(searchParams?.dateTo);
  const normalizedStatus =
    status === "open" || status === "done" || status === "in-progress" || status === "archived" ? status : "all";

  return {
    status: normalizedStatus,
    ownership:
      viewMode === "mine"
        ? "mine"
        : viewMode === "opportunities"
          ? "all"
          : owner === "mine"
            ? "mine"
            : "all",
    groupId: group && group !== "all" ? group : undefined,
    query: query?.trim() ? query.trim() : undefined,
    dateFrom: dateFrom?.trim() ? dateFrom.trim() : undefined,
    dateTo: dateTo?.trim() ? dateTo.trim() : undefined
  };
}

function formatDateRange(startsOn: Date, endsOn: Date, locale: string) {
  const localeTag = locale === "uk" ? "uk-UA" : locale === "es" ? "es" : "en-US";
  const start = startsOn.toLocaleDateString(localeTag, {
    month: "short",
    day: "numeric"
  });
  const end = new Date(endsOn.getTime() - 1).toLocaleDateString(localeTag, {
    month: "short",
    day: "numeric"
  });
  return `${start} – ${end}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getDisplayName(name: string | null, email: string | null) {
  return name ?? email?.split("@")[0] ?? "Member";
}

export default async function TasksPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<TaskSearchParams | undefined>;
}) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);

  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const resolvedSearchParams = await searchParams;
  const weekSelection = parseWeekSelection(resolveParam(resolvedSearchParams?.week));
  const membership = await getParishMembership(parishId, session.user.id);
  if (!membership) {
    throw new Error("Unauthorized");
  }
  const viewMode = getTasksViewMode({
    sessionRole: membership.role,
    searchParams: resolvedSearchParams
  });
  const week = await getWeekForSelection(parishId, weekSelection, getNow());
  const filters = parseTaskFilters(resolvedSearchParams, viewMode);

  const [taskList, groups, members, pendingRequests, pendingTaskApprovals, pendingMyTaskRequests, parish, ytdHours, coordinatorMembership] = await Promise.all([
    listTasks({
      parishId,
      actorUserId: session.user.id,
      weekId: week.id,
      filters,
      viewMode: viewMode === "opportunities" ? "opportunities" : "all"
    }),
    listTaskFilterGroups({
      parishId,
      userId: session.user.id,
      role: membership.role
    }),
    prisma.membership.findMany({
      where: { parishId },
      orderBy: { user: { name: "asc" } },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    getPendingAccessRequests(),
    listPendingTaskApprovals({
      parishId,
      actorUserId: session.user.id,
      weekId: week.id
    }),
    listMyPendingTaskRequests({
      parishId,
      actorUserId: session.user.id,
      weekId: week.id
    }),
    prisma.parish.findUnique({
      where: { id: parishId },
      select: { name: true, logoUrl: true, bronzeHours: true, silverHours: true, goldHours: true }
    }),
    getUserYtdHours({ parishId, userId: session.user.id }),
    prisma.groupMembership.findFirst({
      where: {
        userId: session.user.id,
        role: "COORDINATOR",
        group: { parishId }
      },
      select: { id: true }
    })
  ]);

  const milestoneTier = getMilestoneTier({
    ytdHours,
    bronzeHours: parish?.bronzeHours ?? 10,
    silverHours: parish?.silverHours ?? 25,
    goldHours: parish?.goldHours ?? 50
  });

  const memberOptions = members.map((membership) => {
    const name = getDisplayName(membership.user.name, membership.user.email);
    return {
      id: membership.user.id,
      name,
      initials: getInitials(name),
      label: membership.user.email ? `${name} · ${membership.user.email}` : name
    };
  });

  const isLeader = isParishLeader(membership.role);
  const canAccessLeaderBoard = canAccessServeBoard(membership.role, Boolean(coordinatorMembership));

  return (
    <ParishionerPageLayout
      pageTitle={t("nav.serve")}
      parishName={parish?.name ?? t("serve.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      isLeader={isLeader}
      subtitle={t("serve.myServeSubtitle")}
      sectionTheme="Serve"
      icon={<HandHeartIcon className="h-6 w-6 text-white" />}
    >
      <VolunteerHoursSummary ytdHours={ytdHours} tier={milestoneTier} />
      <TasksView
        weekLabel={week.label}
        weekRange={formatDateRange(week.startsOn, week.endsOn, locale)}
        weekId={week.id}
        tasks={taskList.tasks}
        summary={taskList.summary}
        filteredCount={taskList.filteredCount}
        filters={taskList.filters}
        groupOptions={groups.map((group) => ({ id: group.id, name: group.name }))}
        showGroupFilterHint={!isLeader && groups.length === 0}
        memberOptions={memberOptions}
        currentUserId={session.user.id}
        pendingAccessRequests={pendingRequests}
        pendingTaskApprovals={pendingTaskApprovals}
        pendingMyTaskRequests={pendingMyTaskRequests}
        approveAccessAction={approveParishAccess}
        rejectAccessAction={rejectParishAccess}
        viewMode={viewMode}
        canManageTasks={isLeader}
        canAccessLeaderBoard={canAccessLeaderBoard}
        canRequestContentCreate={membership.role === "MEMBER"}
      />
    </ParishionerPageLayout>
  );
}
