import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getParishMembership, listGroupsByParish } from "@/server/db/groups";
import { getWeekForSelection, parseWeekSelection } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { listPendingTaskApprovals, listTasks, type TaskFilters } from "@/lib/queries/tasks";
import { getPendingAccessRequests } from "@/lib/queries/access";
import { approveParishAccess, rejectParishAccess } from "@/app/actions/access";
import TasksView from "@/components/tasks/TasksView";
import { getTasksViewMode } from "@/lib/tasks/viewMode";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import VolunteerHoursCard from "@/components/profile/VolunteerHoursCard";
import { isParishLeader } from "@/lib/permissions";
import { HandHeartIcon } from "@/components/icons/ParishIcons";
import { getProfileSettings } from "@/lib/queries/profile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TaskSearchParams = {
  week?: string | string[];
  status?: string | string[];
  owner?: string | string[];
  group?: string | string[];
  q?: string | string[];
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
  const normalizedStatus =
    status === "open" || status === "done" || status === "in-progress" ? status : "all";

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
    query: query?.trim() ? query.trim() : undefined
  };
}

function formatDateRange(startsOn: Date, endsOn: Date) {
  const start = startsOn.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  const end = new Date(endsOn.getTime() - 1).toLocaleDateString("en-US", {
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
  searchParams
}: {
  searchParams?: Promise<TaskSearchParams | undefined>;
}) {
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

  const [taskList, groups, members, pendingRequests, pendingTaskApprovals, parish, profile] = await Promise.all([
    listTasks({
      parishId,
      actorUserId: session.user.id,
      weekId: week.id,
      filters,
      viewMode: viewMode === "opportunities" ? "opportunities" : "all"
    }),
    listGroupsByParish(parishId),
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
    prisma.parish.findUnique({
      where: { id: parishId },
      select: { name: true }
    }),
    getProfileSettings({ userId: session.user.id, parishId })
  ]);

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

  return (
    <ParishionerPageLayout
      pageTitle="Serve"
      parishName={parish?.name ?? "My Parish"}
      isLeader={isLeader}
      subtitle="Opportunities to help and make a difference"
      gradientClass="from-sky-500 via-sky-400 to-cyan-500"
      icon={<HandHeartIcon className="h-6 w-6 text-white" />}
    >
      <div className="w-full md:ml-auto md:max-w-md">
        <VolunteerHoursCard
          ytdHours={profile.ytdHours}
          tier={profile.milestoneTier}
          bronzeHours={profile.bronzeHours}
          silverHours={profile.silverHours}
          goldHours={profile.goldHours}
        />
      </div>
      <TasksView
        weekLabel={week.label}
        weekRange={formatDateRange(week.startsOn, week.endsOn)}
        weekId={week.id}
        tasks={taskList.tasks}
        summary={taskList.summary}
        filteredCount={taskList.filteredCount}
        filters={taskList.filters}
        groupOptions={groups.map((group) => ({ id: group.id, name: group.name }))}
        memberOptions={memberOptions}
        currentUserId={session.user.id}
        pendingAccessRequests={pendingRequests}
        pendingTaskApprovals={pendingTaskApprovals}
        approveAccessAction={approveParishAccess}
        rejectAccessAction={rejectParishAccess}
        viewMode={viewMode}
        canManageTasks={isLeader}
      />
    </ParishionerPageLayout>
  );
}
