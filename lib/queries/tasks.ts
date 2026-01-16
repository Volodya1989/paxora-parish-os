import { type Prisma } from "@prisma/client";
import { canManageGroupMembership } from "@/lib/permissions";
import { getNow } from "@/lib/time/getNow";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { prisma } from "@/server/db/prisma";

export type TaskStatusFilter = "all" | "open" | "done";
export type TaskOwnershipFilter = "mine" | "all";

export type TaskFilters = {
  status: TaskStatusFilter;
  ownership: TaskOwnershipFilter;
  groupId?: string;
  query?: string;
};

export type TaskListItem = {
  id: string;
  title: string;
  notes: string | null;
  status: "OPEN" | "DONE";
  completedAt: string | null;
  completedBy: {
    id: string;
    name: string;
  } | null;
  owner: {
    id: string;
    name: string;
    initials: string;
  };
  group: {
    id: string;
    name: string;
  } | null;
  canManage: boolean;
  canDelete: boolean;
};

export type TaskListSummary = {
  total: number;
  open: number;
  done: number;
};

export type ListTasksInput = {
  parishId: string;
  actorUserId: string;
  weekId?: string;
  filters?: TaskFilters;
};

const statusCountsDefaults: TaskListSummary = {
  total: 0,
  open: 0,
  done: 0
};

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
  return name ?? email?.split("@")[0] ?? "Unassigned";
}

export async function listTasks({
  parishId,
  actorUserId,
  weekId,
  filters
}: ListTasksInput) {
  const effectiveWeekId = weekId ?? (await getOrCreateCurrentWeek(parishId, getNow())).id;
  const normalizedFilters: TaskFilters = {
    status: filters?.status ?? "all",
    ownership: filters?.ownership ?? "all",
    groupId: filters?.groupId,
    query: filters?.query
  };

  const baseWhere = {
    parishId,
    weekId: effectiveWeekId,
    archivedAt: null
  };

  const where: Prisma.TaskWhereInput = { ...baseWhere };

  if (normalizedFilters.status === "open") {
    where.status = "OPEN";
  } else if (normalizedFilters.status === "done") {
    where.status = "DONE";
  }

  if (normalizedFilters.ownership === "mine") {
    where.ownerId = actorUserId;
  }

  if (normalizedFilters.groupId) {
    where.groupId = normalizedFilters.groupId;
  }

  if (normalizedFilters.query) {
    where.OR = [
      { title: { contains: normalizedFilters.query, mode: "insensitive" } },
      { notes: { contains: normalizedFilters.query, mode: "insensitive" } }
    ];
  }

  const [tasks, statusCounts, parishMembership, groupMemberships] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        notes: true,
        status: true,
        completedAt: true,
        completedById: true,
        ownerId: true,
        groupId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        },
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true }
    }),
    prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId,
          userId: actorUserId
        }
      },
      select: { role: true }
    }),
    prisma.groupMembership.findMany({
      where: {
        userId: actorUserId,
        group: { parishId }
      },
      select: {
        groupId: true,
        role: true
      }
    })
  ]);

  const groupRoleMap = new Map(groupMemberships.map((membership) => [membership.groupId, membership.role]));

  const summary = statusCounts.reduce((acc, item) => {
    if (item.status === "OPEN") {
      acc.open = item._count._all;
    } else if (item.status === "DONE") {
      acc.done = item._count._all;
    }
    acc.total += item._count._all;
    return acc;
  }, { ...statusCountsDefaults });

  const taskItems: TaskListItem[] = tasks.map((task) => {
    const ownerName = getDisplayName(task.owner.name, task.owner.email);
    const groupRole = task.groupId ? groupRoleMap.get(task.groupId) ?? null : null;
    const canManage =
      task.ownerId === actorUserId ||
      (parishMembership
        ? canManageGroupMembership(parishMembership.role, groupRole)
        : false);
    const completedByName = task.completedBy
      ? getDisplayName(task.completedBy.name, task.completedBy.email)
      : null;

    return {
      id: task.id,
      title: task.title,
      notes: task.notes ?? null,
      status: task.status,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      completedBy: completedByName && task.completedBy
        ? {
            id: task.completedBy.id,
            name: completedByName
          }
        : null,
      owner: {
        id: task.owner.id,
        name: ownerName,
        initials: getInitials(ownerName)
      },
      group: task.group ? { id: task.group.id, name: task.group.name } : null,
      canManage,
      canDelete: task.ownerId === actorUserId
    };
  });

  return {
    weekId: effectiveWeekId,
    filters: normalizedFilters,
    tasks: taskItems,
    summary,
    filteredCount: taskItems.length
  };
}
