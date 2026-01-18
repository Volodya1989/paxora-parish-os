import { type Prisma, TaskApprovalStatus, TaskVisibility } from "@prisma/client";
import { canManageGroupMembership, isParishLeader } from "@/lib/permissions";
import { getNow } from "@/lib/time/getNow";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { prisma } from "@/server/db/prisma";

export type TaskStatusFilter = "all" | "open" | "in-progress" | "done";
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
  estimatedHours: number | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  visibility: "PRIVATE" | "PUBLIC";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  completedAt: string | null;
  inProgressAt: string | null;
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
  canStartWork: boolean;
};

export type TaskListSummary = {
  total: number;
  open: number;
  inProgress: number;
  done: number;
};

export type ListTasksInput = {
  parishId: string;
  actorUserId: string;
  weekId?: string;
  filters?: TaskFilters;
  viewMode?: "all" | "opportunities";
};

export type PendingTaskApproval = {
  id: string;
  title: string;
  notes: string | null;
  createdAt: Date;
  owner: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
  };
  group: {
    id: string;
    name: string;
  } | null;
};

const statusCountsDefaults: TaskListSummary = {
  total: 0,
  open: 0,
  inProgress: 0,
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
  filters,
  viewMode = "all"
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

  const visibilityWhere: Prisma.TaskWhereInput =
    viewMode === "opportunities"
      ? { visibility: TaskVisibility.PUBLIC, approvalStatus: TaskApprovalStatus.APPROVED }
      : {
          OR: [
            { visibility: TaskVisibility.PUBLIC, approvalStatus: TaskApprovalStatus.APPROVED },
            { ownerId: actorUserId },
            { createdById: actorUserId }
          ]
        };

  const andFilters: Prisma.TaskWhereInput[] = [visibilityWhere];
  const where: Prisma.TaskWhereInput = { ...baseWhere, AND: andFilters };

  if (normalizedFilters.status === "open") {
    andFilters.push({ status: "OPEN" });
  } else if (normalizedFilters.status === "in-progress") {
    andFilters.push({ status: "IN_PROGRESS" });
  } else if (normalizedFilters.status === "done") {
    andFilters.push({ status: "DONE" });
  }

  if (viewMode === "opportunities") {
    andFilters.push({ status: { in: ["OPEN", "IN_PROGRESS"] } });
  }

  if (normalizedFilters.ownership === "mine") {
    andFilters.push({ ownerId: actorUserId });
  }

  if (normalizedFilters.groupId) {
    andFilters.push({ groupId: normalizedFilters.groupId });
  }

  if (normalizedFilters.query) {
    andFilters.push({
      OR: [
        { title: { contains: normalizedFilters.query, mode: "insensitive" } },
        { notes: { contains: normalizedFilters.query, mode: "insensitive" } }
      ]
    });
  }

  const [tasks, statusCounts, parishMembership, groupMemberships] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        notes: true,
        estimatedHours: true,
        status: true,
        visibility: true,
        approvalStatus: true,
        inProgressAt: true,
        completedAt: true,
        completedById: true,
        ownerId: true,
        createdById: true,
        groupId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
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
      where: { ...baseWhere, AND: [visibilityWhere] },
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
        status: "ACTIVE",
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
    const count = item._count?._all ?? 0;
    if (item.status === "OPEN") {
      acc.open = count;
    } else if (item.status === "IN_PROGRESS") {
      acc.inProgress = count;
    } else if (item.status === "DONE") {
      acc.done = count;
    }
    acc.total += count;
    return acc;
  }, { ...statusCountsDefaults });

  const taskItems: TaskListItem[] = tasks.map((task) => {
    const ownerName = getDisplayName(task.owner.name, task.owner.email);
    const groupRole = task.groupId ? groupRoleMap.get(task.groupId) ?? null : null;
    const canManageGroup =
      task.visibility === "PUBLIC" &&
      task.approvalStatus === "APPROVED" &&
      parishMembership
        ? canManageGroupMembership(parishMembership.role, groupRole)
        : false;
    const canManage =
      task.ownerId === actorUserId || task.createdById === actorUserId || canManageGroup;
    const canStartWork =
      Boolean(parishMembership) &&
      task.visibility === "PUBLIC" &&
      task.approvalStatus === "APPROVED" &&
      task.status !== "DONE";
    const completedByName = task.completedBy
      ? getDisplayName(task.completedBy.name, task.completedBy.email)
      : null;

    return {
      id: task.id,
      title: task.title,
      notes: task.notes ?? null,
      estimatedHours: task.estimatedHours ?? null,
      status: task.status,
      visibility: task.visibility,
      approvalStatus: task.approvalStatus,
      inProgressAt: task.inProgressAt ? task.inProgressAt.toISOString() : null,
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
      canDelete: task.ownerId === actorUserId || task.createdById === actorUserId,
      canStartWork
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

export async function listPendingTaskApprovals({
  parishId,
  actorUserId,
  weekId
}: {
  parishId: string;
  actorUserId: string;
  weekId?: string;
}): Promise<PendingTaskApproval[]> {
  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId: actorUserId
      }
    },
    select: { role: true }
  });

  if (!membership || !isParishLeader(membership.role)) {
    return [];
  }

  const effectiveWeekId = weekId ?? (await getOrCreateCurrentWeek(parishId, getNow())).id;

  const approvals = await prisma.task.findMany({
    where: {
      parishId,
      weekId: effectiveWeekId,
      archivedAt: null,
      visibility: "PUBLIC",
      approvalStatus: "PENDING"
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      notes: true,
      createdAt: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      createdBy: {
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
      }
    }
  });

  return approvals.map((task) => ({
    id: task.id,
    title: task.title,
    notes: task.notes ?? null,
    createdAt: task.createdAt,
    owner: {
      id: task.owner.id,
      name: getDisplayName(task.owner.name, task.owner.email)
    },
    createdBy: {
      id: task.createdBy.id,
      name: getDisplayName(task.createdBy.name, task.createdBy.email)
    },
    group: task.group ? { id: task.group.id, name: task.group.name } : null
  }));
}
