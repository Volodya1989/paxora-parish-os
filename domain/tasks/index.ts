import { canManageGroupMembership } from "@/lib/permissions";
import { getGroupMembership, getParishMembership } from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";

type CreateTaskInput = {
  parishId: string;
  weekId: string;
  ownerId: string;
  groupId?: string;
  title: string;
  notes?: string;
};

type UpdateTaskInput = TaskActionInput & {
  title: string;
  notes?: string;
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
  groupId,
  title,
  notes
}: CreateTaskInput) {
  return prisma.task.create({
    data: {
      parishId,
      weekId,
      ownerId,
      groupId,
      title,
      notes
    }
  });
}

async function assertTaskOwnership({ taskId, parishId, actorUserId }: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, ownerId: true, parishId: true }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.ownerId !== actorUserId) {
    throw new Error("Forbidden");
  }

  return task;
}

async function assertTaskAccess({ taskId, parishId, actorUserId }: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, ownerId: true, parishId: true, groupId: true }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.ownerId === actorUserId) {
    return task;
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
  notes
}: UpdateTaskInput) {
  await assertTaskAccess({ taskId, parishId, actorUserId });

  return prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      notes
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
      groupId: true
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
      title: task.title,
      notes: task.notes ?? undefined,
      groupId: task.groupId ?? undefined,
      rolledFromTaskId: task.id
    }));

  if (newTasks.length === 0) {
    return 0;
  }

  const result = await prisma.task.createMany({ data: newTasks });
  return result.count;
}
