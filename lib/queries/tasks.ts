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
  volunteersNeeded: number;
  volunteerCount: number;
  hasVolunteered: boolean;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  visibility: "PRIVATE" | "PUBLIC";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  dueAt: string;
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
  } | null;
  group: {
    id: string;
    name: string;
  } | null;
  canManage: boolean;
  canDelete: boolean;
  canStartWork: boolean;
  canManageStatus: boolean;
  canAssignToSelf: boolean;
  canAssignOthers: boolean;
  createdByRole: "ADMIN" | "SHEPHERD" | "MEMBER" | null;
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
  } | null;
  createdBy: {
    id: string;
    name: string;
  };
  createdByRole: "ADMIN" | "SHEPHERD" | "MEMBER" | null;
  group: {
    id: string;
    name: string;
  } | null;
};

export type TaskDetail = {
  id: string;
  title: string;
  notes: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  visibility: "PRIVATE" | "PUBLIC";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  volunteersNeeded: number;
  dueAt: string;
  owner: {
    id: string;
    name: string;
    initials: string;
  } | null;
  group: {
    id: string;
    name: string;
  } | null;
  volunteers: Array<{ id: string; name: string; initials: string }>;
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; name: string; initials: string };
  }>;
  activities: Array<{
    id: string;
    description: string;
    createdAt: string;
    actor: { id: string; name: string; initials: string };
  }>;
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

function resolveDueAt(dueAt: Date | null, createdAt: Date) {
  if (dueAt) {
    return dueAt;
  }
  const fallback = new Date(createdAt);
  fallback.setDate(fallback.getDate() + 14);
  return fallback;
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
        volunteersNeeded: true,
        status: true,
        visibility: true,
        approvalStatus: true,
        createdAt: true,
        dueAt: true,
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
        volunteers: {
          where: { userId: actorUserId },
          select: { id: true }
        },
        _count: {
          select: { volunteers: true }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            memberships: {
              where: { parishId },
              select: { role: true }
            }
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
    const ownerName = task.owner ? getDisplayName(task.owner.name, task.owner.email) : null;
    const groupRole = task.groupId ? groupRoleMap.get(task.groupId) ?? null : null;
    const isLeader = parishMembership ? isParishLeader(parishMembership.role) : false;
    const canManageGroup =
      task.visibility === "PUBLIC" &&
      task.approvalStatus === "APPROVED" &&
      parishMembership
        ? canManageGroupMembership(parishMembership.role, groupRole)
        : false;
    const canManage =
      task.ownerId === actorUserId || task.createdById === actorUserId || canManageGroup;
    const hasVolunteered = task.volunteers.length > 0;
    const canManageStatus =
      task.volunteersNeeded > 1
        ? task.ownerId === actorUserId || hasVolunteered
        : task.ownerId === actorUserId;
    const canStartWork =
      Boolean(parishMembership) &&
      task.visibility === "PUBLIC" &&
      task.approvalStatus === "APPROVED" &&
      task.status !== "DONE" &&
      task.ownerId === actorUserId &&
      task.volunteersNeeded <= 1;
    const canAssignToSelf =
      Boolean(parishMembership) &&
      task.visibility === "PUBLIC" &&
      task.approvalStatus === "APPROVED" &&
      task.status === "OPEN" &&
      !task.ownerId &&
      task.volunteersNeeded <= 1 &&
      (!task.groupId || groupRoleMap.has(task.groupId));
    const canAssignOthers =
      Boolean(parishMembership) && (isLeader || (task.groupId ? canManageGroup : false));
    const completedByName = task.completedBy
      ? getDisplayName(task.completedBy.name, task.completedBy.email)
      : null;
    const createdByRole = task.createdBy.memberships[0]?.role ?? null;

    return {
      id: task.id,
      title: task.title,
      notes: task.notes ?? null,
      estimatedHours: task.estimatedHours ?? null,
      volunteersNeeded: task.volunteersNeeded,
      volunteerCount: task._count?.volunteers ?? 0,
      hasVolunteered: task.volunteers.length > 0,
      status: task.status,
      visibility: task.visibility,
      approvalStatus: task.approvalStatus,
      inProgressAt: task.inProgressAt ? task.inProgressAt.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      dueAt: resolveDueAt(task.dueAt, task.createdAt).toISOString(),
      completedBy: completedByName && task.completedBy
        ? {
            id: task.completedBy.id,
            name: completedByName
          }
        : null,
      owner: ownerName && task.owner
        ? {
            id: task.owner.id,
            name: ownerName,
            initials: getInitials(ownerName)
          }
        : null,
      group: task.group ? { id: task.group.id, name: task.group.name } : null,
      canManage,
      canDelete: isLeader || task.createdById === actorUserId,
      canStartWork,
      canManageStatus,
      canAssignToSelf,
      canAssignOthers,
      createdByRole
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
          email: true,
          memberships: {
            where: { parishId },
            select: { role: true }
          }
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
    owner: task.owner
      ? {
          id: task.owner.id,
          name: getDisplayName(task.owner.name, task.owner.email)
        }
      : null,
    createdBy: {
      id: task.createdBy.id,
      name: getDisplayName(task.createdBy.name, task.createdBy.email)
    },
    createdByRole: task.createdBy.memberships[0]?.role ?? null,
    group: task.group ? { id: task.group.id, name: task.group.name } : null
  }));
}

export async function getTaskDetail({
  taskId,
  actorUserId
}: {
  taskId: string;
  actorUserId: string;
}): Promise<TaskDetail | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      parishId: true,
      ownerId: true,
      createdById: true,
      title: true,
      notes: true,
      status: true,
      visibility: true,
      approvalStatus: true,
      volunteersNeeded: true,
      createdAt: true,
      dueAt: true,
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
      volunteers: {
        orderBy: { createdAt: "asc" },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      activities: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          description: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!task) {
    return null;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: task.parishId,
        userId: actorUserId
      }
    },
    select: { id: true }
  });

  if (!membership) {
    return null;
  }

  const isOwnerOrCreator =
    task.ownerId === actorUserId || task.createdById === actorUserId;
  if (!isOwnerOrCreator) {
    if (task.visibility === "PRIVATE") {
      return null;
    }
    if (task.approvalStatus !== "APPROVED") {
      return null;
    }
  }

  const ownerName = task.owner ? getDisplayName(task.owner.name, task.owner.email) : null;

  return {
    id: task.id,
    title: task.title,
    notes: task.notes ?? null,
    status: task.status,
    visibility: task.visibility,
    approvalStatus: task.approvalStatus,
    volunteersNeeded: task.volunteersNeeded,
    dueAt: resolveDueAt(task.dueAt, task.createdAt).toISOString(),
    owner: ownerName && task.owner
      ? {
          id: task.owner.id,
          name: ownerName,
          initials: getInitials(ownerName)
        }
      : null,
    group: task.group ? { id: task.group.id, name: task.group.name } : null,
    volunteers: task.volunteers.map((volunteer) => {
      const name = getDisplayName(volunteer.user.name, volunteer.user.email);
      return {
        id: volunteer.user.id,
        name,
        initials: getInitials(name)
      };
    }),
    comments: task.comments.map((comment) => {
      const name = getDisplayName(comment.author.name, comment.author.email);
      return {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: comment.author.id,
          name,
          initials: getInitials(name)
        }
      };
    }),
    activities: task.activities.map((activity) => {
      const name = getDisplayName(activity.actor.name, activity.actor.email);
      return {
        id: activity.id,
        description: activity.description,
        createdAt: activity.createdAt.toISOString(),
        actor: {
          id: activity.actor.id,
          name,
          initials: getInitials(name)
        }
      };
    })
  };
}
