import { type Prisma, TaskApprovalStatus, TaskVisibility } from "@prisma/client";
import { canManageGroupMembership, isParishLeader } from "@/lib/permissions";
import { getNow } from "@/lib/time/getNow";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { prisma } from "@/server/db/prisma";
import { getParishMembership } from "@/server/db/groups";

export type TaskStatusFilter = "all" | "open" | "in-progress" | "done" | "archived";
export type TaskOwnershipFilter = "mine" | "all";

export type TaskFilters = {
  status: TaskStatusFilter;
  ownership: TaskOwnershipFilter;
  groupId?: string;
  query?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type TaskListItem = {
  id: string;
  displayId: string;
  title: string;
  notes: string | null;
  estimatedHours: number | null;
  volunteersNeeded: number;
  volunteerCount: number;
  hasVolunteered: boolean;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
  visibility: "PRIVATE" | "PUBLIC";
  openToVolunteers: boolean;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  dueAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  inProgressAt: string | null;
  updatedAt: string;
  updatedBy: {
    id: string;
    name: string;
  } | null;
  completedBy: {
    id: string;
    name: string;
  } | null;
  owner: {
    id: string;
    name: string;
    initials: string;
  } | null;
  coordinator: {
    id: string;
    name: string;
  } | null;
  group: {
    id: string;
    name: string;
  } | null;
  userTags: Array<{
    id: string;
    name: string;
  }>;
  createdById: string;
  canManage: boolean;
  canDelete: boolean;
  canStartWork: boolean;
  canManageStatus: boolean;
  canAssignToSelf: boolean;
  canAssignOthers: boolean;
  canVolunteer: boolean;
  createdByRole: "ADMIN" | "SHEPHERD" | "MEMBER" | null;
};

export type TaskListSummary = {
  total: number;
  open: number;
  inProgress: number;
  done: number;
  archived: number;
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
  displayId: string;
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


export type PendingTaskRequest = {
  id: string;
  title: string;
  notes: string | null;
  createdAt: Date;
  group: {
    id: string;
    name: string;
  } | null;
};

export type TaskDetail = {
  id: string;
  displayId: string;
  title: string;
  notes: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
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
    mentionEntities: Array<{ userId: string; displayName: string; email: string; start: number; end: number }>;
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
  done: 0,
  archived: 0
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

function parseDateFilter(value?: string, endOfDay?: boolean) {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}${endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
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
    query: filters?.query,
    dateFrom: filters?.dateFrom,
    dateTo: filters?.dateTo
  };

  const parishMembership = await getParishMembership(parishId, actorUserId);
  const isLeader = parishMembership ? isParishLeader(parishMembership.role) : false;
  const groupMemberships = await prisma.groupMembership.findMany({
    where: {
      userId: actorUserId,
      status: "ACTIVE",
      group: { parishId }
    },
    select: {
      groupId: true,
      role: true
    }
  });
  const memberGroupIds = groupMemberships.map((membership) => membership.groupId);

  const baseWhere: Prisma.TaskWhereInput = {
    parishId,
    ...(normalizedFilters.status === "archived" ? {} : { weekId: effectiveWeekId })
  };

  const publicVisibilityFilter: Prisma.TaskWhereInput = memberGroupIds.length
    ? {
        visibility: TaskVisibility.PUBLIC,
        approvalStatus: TaskApprovalStatus.APPROVED,
        OR: [{ groupId: null }, { groupId: { in: memberGroupIds } }]
      }
    : { visibility: TaskVisibility.PUBLIC, approvalStatus: TaskApprovalStatus.APPROVED, groupId: null };

  const visibilityWhere: Prisma.TaskWhereInput =
    viewMode === "opportunities"
      ? publicVisibilityFilter
      : isLeader
        ? {
            OR: [
              { visibility: TaskVisibility.PUBLIC },
              { createdById: actorUserId },
              { visibility: TaskVisibility.PRIVATE, ownerId: actorUserId }
            ]
          }
        : {
            OR: [
              publicVisibilityFilter,
              { createdById: actorUserId },
              { visibility: TaskVisibility.PUBLIC, ownerId: actorUserId },
              { visibility: TaskVisibility.PRIVATE, ownerId: actorUserId }
            ]
          };

  const andFilters: Prisma.TaskWhereInput[] = [visibilityWhere];
  const where: Prisma.TaskWhereInput = { ...baseWhere, AND: andFilters };

  if (viewMode === "opportunities" && !isLeader) {
    andFilters.push({ openToVolunteers: true });
  }

  if (normalizedFilters.status === "open") {
    andFilters.push({ status: "OPEN" });
  } else if (normalizedFilters.status === "in-progress") {
    andFilters.push({ status: "IN_PROGRESS" });
  } else if (normalizedFilters.status === "done") {
    andFilters.push({ status: "DONE" });
  } else if (normalizedFilters.status === "archived") {
    andFilters.push({ status: "ARCHIVED" });
  } else {
    andFilters.push({ status: { in: ["OPEN", "IN_PROGRESS", "DONE"] } });
  }

  if (
    viewMode === "opportunities" &&
    (normalizedFilters.status === "open" || normalizedFilters.status === "in-progress")
  ) {
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
        { displayId: { contains: normalizedFilters.query, mode: "insensitive" } },
        { title: { contains: normalizedFilters.query, mode: "insensitive" } },
        { notes: { contains: normalizedFilters.query, mode: "insensitive" } }
      ]
    });
  }

  const dateFrom = parseDateFilter(normalizedFilters.dateFrom, false);
  const dateTo = parseDateFilter(normalizedFilters.dateTo, true);
  if (dateFrom || dateTo) {
    const createdAtRange: Prisma.DateTimeFilter = {};
    const completedAtRange: Prisma.DateTimeNullableFilter = { not: null };
    if (dateFrom) {
      createdAtRange.gte = dateFrom;
      completedAtRange.gte = dateFrom;
    }
    if (dateTo) {
      createdAtRange.lte = dateTo;
      completedAtRange.lte = dateTo;
    }

    andFilters.push({
      OR: [
        { status: { in: ["OPEN", "IN_PROGRESS"] }, createdAt: createdAtRange },
        { status: { in: ["DONE", "ARCHIVED"] }, completedAt: completedAtRange }
      ]
    });
  }

  const [tasks, statusCounts] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        displayId: true,
        title: true,
        notes: true,
        estimatedHours: true,
        volunteersNeeded: true,
        status: true,
        visibility: true,
        openToVolunteers: true,
        approvalStatus: true,
        createdAt: true,
        updatedAt: true,
        dueAt: true,
        inProgressAt: true,
        completedAt: true,
        archivedAt: true,
        completedById: true,
        ownerId: true,
        createdById: true,
        groupId: true,
        coordinatorId: true,
        updatedByUserId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        coordinator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updatedBy: {
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
        },
        taskUserTags: {
          where: {
            userTag: {
              userId: actorUserId
            }
          },
          select: {
            userTag: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { ...baseWhere, AND: [visibilityWhere] },
      _count: { _all: true }
    })
  ]);

  const groupRoleMap = new Map(groupMemberships.map((membership) => [membership.groupId, membership.role]));

  const summary = statusCounts.reduce((acc, item) => {
    const count = item._count?._all ?? 0;
    if (item.status === "OPEN") {
      acc.open = count;
      acc.total += count;
    } else if (item.status === "IN_PROGRESS") {
      acc.inProgress = count;
      acc.total += count;
    } else if (item.status === "DONE") {
      acc.done = count;
      acc.total += count;
    } else if (item.status === "ARCHIVED") {
      acc.archived = count;
    }
    return acc;
  }, { ...statusCountsDefaults });

  const taskItems: TaskListItem[] = tasks.map((task) => {
    const ownerName = task.owner ? getDisplayName(task.owner.name, task.owner.email) : null;
    const groupRole = task.groupId ? groupRoleMap.get(task.groupId) ?? null : null;
    const isCoordinator = task.coordinatorId === actorUserId;
    const canManageGroup =
      task.visibility === "PUBLIC" &&
      task.approvalStatus === "APPROVED" &&
      parishMembership
        ? canManageGroupMembership(parishMembership.role, groupRole)
        : false;
    const canManage =
      isLeader ||
      isCoordinator ||
      task.ownerId === actorUserId ||
      task.createdById === actorUserId ||
      canManageGroup;
    const hasVolunteered = task.volunteers.length > 0;
    const canManageStatus = (() => {
      if (task.status === "ARCHIVED") {
        return false;
      }
      if (isLeader || isCoordinator) {
        return true;
      }
      if (task.visibility === "PRIVATE") {
        return task.createdById === actorUserId;
      }
      if (task.volunteersNeeded > 1) {
        if (task.ownerId === actorUserId) {
          return true;
        }
        return task.openToVolunteers && hasVolunteered;
      }
      return task.ownerId === actorUserId;
    })();
    const canStartWork = canManageStatus && task.status === "OPEN";
    const canAssignToSelf =
      Boolean(parishMembership) &&
      task.visibility === "PUBLIC" &&
      task.approvalStatus === "APPROVED" &&
      task.status === "OPEN" &&
      !task.ownerId &&
      task.volunteersNeeded <= 1 &&
      (!task.groupId || groupRoleMap.has(task.groupId)) &&
      (task.openToVolunteers || isLeader || isCoordinator);
    const canAssignOthers =
      Boolean(parishMembership) &&
      task.visibility === "PUBLIC" &&
      (isLeader || isCoordinator || (task.groupId ? canManageGroup : false));
    const canVolunteer =
      Boolean(parishMembership) &&
      task.visibility === "PUBLIC" &&
      task.approvalStatus === "APPROVED" &&
      !(["DONE", "ARCHIVED"].includes(task.status)) &&
      task.volunteersNeeded > 1 &&
      (!task.groupId || groupRoleMap.has(task.groupId)) &&
      (task.openToVolunteers || isLeader || isCoordinator);
    const completedByName = task.completedBy
      ? getDisplayName(task.completedBy.name, task.completedBy.email)
      : null;
    const createdByRole = task.createdBy.memberships[0]?.role ?? null;
    const updatedByName = task.updatedBy
      ? getDisplayName(task.updatedBy.name, task.updatedBy.email)
      : null;
    const coordinatorName = task.coordinator
      ? getDisplayName(task.coordinator.name, task.coordinator.email)
      : null;

    return {
      id: task.id,
      displayId: task.displayId,
      title: task.title,
      notes: task.notes ?? null,
      estimatedHours: task.estimatedHours ?? null,
      volunteersNeeded: task.volunteersNeeded,
      volunteerCount: task._count?.volunteers ?? 0,
      hasVolunteered: task.volunteers.length > 0,
      status: task.status,
      visibility: task.visibility,
      openToVolunteers: task.openToVolunteers,
      approvalStatus: task.approvalStatus,
      inProgressAt: task.inProgressAt ? task.inProgressAt.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      archivedAt: task.archivedAt ? task.archivedAt.toISOString() : null,
      dueAt: resolveDueAt(task.dueAt, task.createdAt).toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      updatedBy: updatedByName && task.updatedBy
        ? {
            id: task.updatedBy.id,
            name: updatedByName
          }
        : null,
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
      coordinator: coordinatorName && task.coordinator
        ? {
            id: task.coordinator.id,
            name: coordinatorName
          }
        : null,
      group: task.group ? { id: task.group.id, name: task.group.name } : null,
      userTags: task.taskUserTags.map((taskUserTag) => ({
        id: taskUserTag.userTag.id,
        name: taskUserTag.userTag.name
      })),
      createdById: task.createdById,
      canManage,
      canDelete: isLeader || task.createdById === actorUserId,
      canStartWork,
      canManageStatus,
      canAssignToSelf,
      canAssignOthers,
      canVolunteer,
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
  const membership = await getParishMembership(parishId, actorUserId);

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
      displayId: true,
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
    displayId: task.displayId,
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


export async function listMyPendingTaskRequests({
  parishId,
  actorUserId,
  weekId
}: {
  parishId: string;
  actorUserId: string;
  weekId?: string;
}): Promise<PendingTaskRequest[]> {
  const effectiveWeekId = weekId ?? (await getOrCreateCurrentWeek(parishId, getNow())).id;

  const requests = await prisma.task.findMany({
    where: {
      parishId,
      weekId: effectiveWeekId,
      archivedAt: null,
      visibility: "PUBLIC",
      approvalStatus: "PENDING",
      createdById: actorUserId
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      notes: true,
      createdAt: true,
      group: { select: { id: true, name: true } }
    }
  });

  return requests.map((task) => ({
    id: task.id,
    title: task.title,
    notes: task.notes ?? null,
    createdAt: task.createdAt,
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
      displayId: true,
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
          mentionEntities: true,
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

  const membership = await getParishMembership(task.parishId, actorUserId);

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
    displayId: task.displayId,
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
        mentionEntities: Array.isArray(comment.mentionEntities) ? (comment.mentionEntities as any[]) : [],
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
