import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { listGroupsByParish } from "@/server/db/groups";
import { getWeekForSelection, parseWeekSelection } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { listTasks, type TaskFilters } from "@/lib/queries/tasks";
import TasksView from "@/components/tasks/TasksView";

type TaskSearchParams = {
  week?: string | string[];
  status?: string | string[];
  owner?: string | string[];
  group?: string | string[];
  q?: string | string[];
  create?: string;
};

function resolveParam(param?: string | string[]) {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

function parseTaskFilters(searchParams?: TaskSearchParams): TaskFilters {
  const status = resolveParam(searchParams?.status);
  const owner = resolveParam(searchParams?.owner);
  const group = resolveParam(searchParams?.group);
  const query = resolveParam(searchParams?.q);

  return {
    status: status === "open" || status === "done" ? status : "all",
    ownership: owner === "mine" ? "mine" : "all",
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
  const week = await getWeekForSelection(parishId, weekSelection, getNow());
  const filters = parseTaskFilters(resolvedSearchParams);

  const [taskList, groups, members] = await Promise.all([
    listTasks({
      parishId,
      actorUserId: session.user.id,
      weekId: week.id,
      filters
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
    })
  ]);

  const memberOptions = members.map((membership) => {
    const name = getDisplayName(membership.user.name, membership.user.email);
    return {
      id: membership.user.id,
      name,
      initials: getInitials(name)
    };
  });

  return (
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
    />
  );
}
