import { canManageGroupMembership, isParishLeader } from "@/lib/permissions";
import { getGroupMembership, getParishMembership } from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";

type CreateTaskInput = {
  parishId: string;
  weekId: string;
  ownerId: string;
  createdById: string;
  groupId?: string;
  title: string;
  notes?: string;
  estimatedHours?: number;
  visibility: "PRIVATE" | "PUBLIC";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
};

type UpdateTaskInput = TaskActionInput & {
  title: string;
  notes?: string;
  estimatedHours?: number;
  groupId?: string;
  ownerId?: string;
  visibility?: "PRIVATE" | "PUBLIC";
};

type TaskActionInput = {
  taskId: string;
  parishId: string;
  actorUserId: string;
};

type DeferTaskInput = TaskActionInput & {
  targetWeekId: string;
};

type RolloverTaskInput = {
  parishId: string;
  fromWeekId: string;
  toWeekId: string;
};

export async function createTask({
  parishId,
  weekId,
  ownerId,
  createdById,
  groupId,
  title,
  notes,
  estimatedHours,
  visibility,
  approvalStatus
}: CreateTaskInput) {
  return prisma.task.create({
    data: {
      parishId,
      weekId,
      ownerId,
      createdById,
      groupId,
      title,
      notes,
      estimatedHours,
      visibility,
      approvalStatus
    }
  });
}

async function assertTaskOwnership({ taskId, parishId, actorUserId }: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, ownerId: true, createdById: true, parishId: true }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.ownerId !== actorUserId && task.createdById !== actorUserId) {
    throw new Error("Forbidden");
  }

  return task;
}

async function assertTaskAccess({ taskId, parishId, actorUserId }: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      ownerId: true,
      createdById: true,
      parishId: true,
      groupId: true,
      visibility: true,
      approvalStatus: true
    }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.ownerId === actorUserId || task.createdById === actorUserId) {
    return task;
  }

  if (task.visibility === "PRIVATE") {
    throw new Error("Forbidden");
  }

  if (task.approvalStatus !== "APPROVED") {
    throw new Error("Forbidden");
  }

  const parishMembership = await getParishMembership(parishId, actorUserId);
  if (!parishMembership) {
    throw new Error("Forbidden");
  }

  const groupMembership = task.groupId
    ? await getGroupMembership(task.groupId, actorUserId)
    : null;

  const allowed = canManageGroupMembership(parishMembership.role, groupMembership?.role ?? null);

  if (!allowed) {
    throw new Error("Forbidden");
  }

  return task;
}

export async function markTaskDone({ taskId, parishId, actorUserId }: TaskActionInput) {
  await assertTaskAccess({ taskId, parishId, actorUserId });

  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: "DONE",
      completedAt: new Date(),
      completedById: actorUserId
    }
  });
}

export async function unmarkTaskDone({ taskId, parishId, actorUserId }: TaskActionInput) {
  await assertTaskAccess({ taskId, parishId, actorUserId });

  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: "OPEN",
      completedAt: null,
      completedById: null
    }
  });
}

export async function deferTask({ taskId, parishId, actorUserId, targetWeekId }: DeferTaskInput) {
  await assertTaskOwnership({ taskId, parishId, actorUserId });

  return prisma.task.update({
    where: { id: taskId },
    data: {
      weekId: targetWeekId
    }
  });
}

export async function archiveTask({ taskId, parishId, actorUserId }: TaskActionInput) {
  await assertTaskAccess({ taskId, parishId, actorUserId });

  return prisma.task.update({
    where: { id: taskId },
    data: {
      archivedAt: new Date()
    }
  });
}

export async function unarchiveTask({ taskId, parishId, actorUserId }: TaskActionInput) {
  await assertTaskAccess({ taskId, parishId, actorUserId });

  return prisma.task.update({
    where: { id: taskId },
    data: {
      archivedAt: null
    }
  });
}

export async function updateTask({
  taskId,
  parishId,
  actorUserId,
  title,
  notes,
  estimatedHours,
  groupId,
  ownerId,
  visibility
}: UpdateTaskInput) {
  const task = await assertTaskAccess({ taskId, parishId, actorUserId });
  const nextVisibility = visibility ?? task.visibility;
  let approvalStatus = task.approvalStatus;

  if (nextVisibility !== task.visibility) {
    if (nextVisibility === "PRIVATE") {
      approvalStatus = "APPROVED";
    } else {
      const membership = await getParishMembership(parishId, actorUserId);
      approvalStatus = membership && isParishLeader(membership.role) ? "APPROVED" : "PENDING";
    }
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      notes,
      estimatedHours,
      groupId,
      ownerId,
      visibility: nextVisibility,
      approvalStatus
    }
  });
}

export async function deleteTask({ taskId, parishId, actorUserId }: TaskActionInput) {
  await assertTaskOwnership({ taskId, parishId, actorUserId });

  return prisma.task.delete({
    where: { id: taskId }
  });
}

export async function rolloverOpenTasks({ parishId, fromWeekId, toWeekId }: RolloverTaskInput) {
  const openTasks = await prisma.task.findMany({
    where: {
      parishId,
      weekId: fromWeekId,
      status: "OPEN",
      archivedAt: null
    },
    select: {
      id: true,
      title: true,
      notes: true,
      ownerId: true,
      createdById: true,
      groupId: true,
      estimatedHours: true,
      visibility: true,
      approvalStatus: true
    }
  });

  if (openTasks.length === 0) {
    return 0;
  }

  const existingRollovers = await prisma.task.findMany({
    where: {
      parishId,
      weekId: toWeekId,
      rolledFromTaskId: { in: openTasks.map((task) => task.id) }
    },
    select: { rolledFromTaskId: true }
  });

  const rolledFromIds = new Set(
    existingRollovers.map((task) => task.rolledFromTaskId).filter(Boolean)
  );

  const newTasks = openTasks
    .filter((task) => !rolledFromIds.has(task.id))
    .map((task) => ({
      parishId,
      weekId: toWeekId,
      ownerId: task.ownerId,
      createdById: task.createdById,
      title: task.title,
      notes: task.notes ?? undefined,
      estimatedHours: task.estimatedHours ?? undefined,
      groupId: task.groupId ?? undefined,
      visibility: task.visibility,
      approvalStatus: task.approvalStatus,
      rolledFromTaskId: task.id
    }));

  if (newTasks.length === 0) {
    return 0;
  }

  const result = await prisma.task.createMany({ data: newTasks });
  return result.count;
}
