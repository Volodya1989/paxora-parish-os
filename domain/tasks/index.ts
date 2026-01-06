import { prisma } from "@/server/db/prisma";

type CreateTaskInput = {
  parishId: string;
  weekId: string;
  ownerId: string;
  groupId?: string;
  title: string;
  notes?: string;
};

type TaskActionInput = {
  taskId: string;
  parishId: string;
  actorUserId: string;
};

type MarkTaskDoneInput = TaskActionInput & {
  allowNonOwner?: boolean;
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

async function assertTaskOwnership({
  taskId,
  parishId,
  actorUserId,
  allowNonOwner
}: TaskActionInput & { allowNonOwner?: boolean }) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, ownerId: true, parishId: true }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.ownerId !== actorUserId && !allowNonOwner) {
    throw new Error("Forbidden");
  }

  return task;
}

export async function markTaskDone({
  taskId,
  parishId,
  actorUserId,
  allowNonOwner
}: MarkTaskDoneInput) {
  await assertTaskOwnership({ taskId, parishId, actorUserId, allowNonOwner });

  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: "DONE",
      completedAt: new Date()
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

export async function rolloverOpenTasks({ parishId, fromWeekId, toWeekId }: RolloverTaskInput) {
  const openTasks = await prisma.task.findMany({
    where: {
      parishId,
      weekId: fromWeekId,
      status: "OPEN"
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
