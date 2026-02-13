import { canManageGroupMembership, isParishLeader } from "@/lib/permissions";
import { sendTaskCompletionEmail } from "@/lib/email/taskCompletion";
import { calculateEstimatedHoursPerParticipant } from "@/lib/hours/allocations";
import { getGroupMembership, getParishMembership } from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";
import { notifyTaskCreated, notifyTaskAssigned } from "@/lib/push/notify";
import { notifyTaskAssignedInApp, notifyTaskCreatedInApp } from "@/lib/notifications/notify";

type CreateTaskInput = {
  parishId: string;
  weekId: string;
  ownerId?: string;
  createdById: string;
  groupId?: string;
  title: string;
  notes?: string;
  estimatedHours?: number;
  volunteersNeeded?: number;
  dueAt?: Date;
  visibility: "PRIVATE" | "PUBLIC";
  openToVolunteers?: boolean;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
};

type UpdateTaskInput = TaskActionInput & {
  title: string;
  notes?: string;
  estimatedHours?: number;
  groupId?: string;
  ownerId?: string;
  volunteersNeeded?: number;
  dueAt?: Date;
  visibility?: "PRIVATE" | "PUBLIC";
};

type TaskActionInput = {
  taskId: string;
  parishId: string;
  actorUserId: string;
};

export type TaskCompletionHoursInput = {
  mode?: "estimated" | "manual" | "skip";
  manualHours?: number | null;
};

type AssignTaskInput = TaskActionInput & {
  ownerId: string;
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
  volunteersNeeded,
  dueAt,
  visibility,
  openToVolunteers,
  approvalStatus
}: CreateTaskInput) {
  const resolvedDueAt = dueAt ?? getDefaultDueAt();
  const task = await prisma.task.create({
    data: {
      parishId,
      weekId,
      ownerId,
      createdById,
      updatedByUserId: createdById,
      groupId,
      title,
      notes,
      estimatedHours,
      volunteersNeeded: volunteersNeeded ?? 1,
      dueAt: resolvedDueAt,
      visibility,
      openToVolunteers: openToVolunteers ?? false,
      approvalStatus
    }
  });

  await createTaskActivity({
    taskId: task.id,
    actorUserId: createdById,
    description: "Created the task."
  });

  // Fire-and-forget push notification for task assignment
  if (ownerId && ownerId !== createdById) {
    const creator = await prisma.user.findUnique({
      where: { id: createdById },
      select: { name: true, email: true }
    });
    notifyTaskCreated({
      taskId: task.id,
      taskTitle: title,
      parishId,
      createdById,
      creatorName: creator?.name ?? creator?.email ?? "Someone",
      ownerId
    }).catch(() => {});
    try {
      await notifyTaskCreatedInApp({
        taskId: task.id,
        taskTitle: title,
        parishId,
        createdById,
        creatorName: creator?.name ?? creator?.email ?? "Someone",
        ownerId
      });
    } catch (error) {
      console.error("[tasks] Failed to create in-app task notification:", error);
    }
  }

  return task;
}

function getDefaultDueAt(baseDate: Date = new Date()) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + 14);
  return next;
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
    const membership = await getParishMembership(parishId, actorUserId);
    if (!membership || !isParishLeader(membership.role)) {
      throw new Error("Forbidden");
    }
  }

  return task;
}

async function assertTaskDeleteAccess({ taskId, parishId, actorUserId }: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, createdById: true, parishId: true }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.createdById === actorUserId) {
    return task;
  }

  const membership = await getParishMembership(parishId, actorUserId);
  if (!membership || !isParishLeader(membership.role)) {
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
      openToVolunteers: true,
      approvalStatus: true,
      volunteersNeeded: true,
      dueAt: true
    }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  const parishMembership = await getParishMembership(parishId, actorUserId);
  if (!parishMembership) {
    throw new Error("Forbidden");
  }
  const isLeader = isParishLeader(parishMembership.role);

  if (task.visibility === "PRIVATE") {
    if (!isLeader && task.createdById !== actorUserId) {
      throw new Error("Forbidden");
    }
    return task;
  }

  if (task.ownerId === actorUserId || task.createdById === actorUserId || isLeader) {
    return task;
  }

  if (task.approvalStatus !== "APPROVED") {
    throw new Error("Forbidden");
  }

  const groupMembership = task.groupId
    ? await getGroupMembership(task.groupId, actorUserId)
    : null;

  const groupRole = groupMembership?.status === "ACTIVE" ? groupMembership.role : null;
  const allowed = canManageGroupMembership(parishMembership.role, groupRole);

  if (!allowed) {
    throw new Error("Forbidden");
  }

  return task;
}

async function assertTaskCommentAccess({ taskId, parishId, actorUserId }: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      ownerId: true,
      createdById: true,
      parishId: true,
      visibility: true,
      approvalStatus: true
    }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  const parishMembership = await getParishMembership(parishId, actorUserId);
  if (!parishMembership) {
    throw new Error("Forbidden");
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

  return task;
}

async function assertTaskStatusAccess({ taskId, parishId, actorUserId }: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      parishId: true,
      status: true,
      visibility: true,
      approvalStatus: true,
      ownerId: true,
      createdById: true,
      coordinatorId: true,
      openToVolunteers: true,
      groupId: true,
      volunteersNeeded: true,
      volunteers: {
        where: { userId: actorUserId },
        select: { id: true }
      }
    }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  const parishMembership = await getParishMembership(parishId, actorUserId);
  if (!parishMembership) {
    throw new Error("Forbidden");
  }

  const isLeader = isParishLeader(parishMembership.role);
  const isCoordinator = task.coordinatorId === actorUserId;

  if (isLeader || isCoordinator) {
    return task;
  }

  if (task.visibility === "PRIVATE") {
    if (task.createdById !== actorUserId) {
      throw new Error("Only the creator or parish leaders can update this private task.");
    }
    return task;
  }

  if (task.volunteersNeeded > 1) {
    const hasVolunteered = task.volunteers.length > 0;
    if (task.ownerId === actorUserId) {
      return task;
    }
    if (!task.openToVolunteers || !hasVolunteered) {
      throw new Error("Forbidden");
    }
  } else {
    if (task.ownerId !== actorUserId) {
      throw new Error("Forbidden");
    }
  }

  return task;
}

async function createTaskActivity({
  taskId,
  actorUserId,
  description
}: {
  taskId: string;
  actorUserId: string;
  description: string;
}) {
  return prisma.taskActivity.create({
    data: {
      taskId,
      actorId: actorUserId,
      description
    }
  });
}

export async function markTaskDone({
  taskId,
  parishId,
  actorUserId,
  hours
}: TaskActionInput & { hours?: TaskCompletionHoursInput }) {
  const task = await assertTaskStatusAccess({ taskId, parishId, actorUserId });
  const parishMembership = await getParishMembership(parishId, actorUserId);
  const isLeader = parishMembership ? isParishLeader(parishMembership.role) : false;
  const taskDetails = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      parishId: true,
      weekId: true,
      groupId: true,
      ownerId: true,
      createdById: true,
      completedById: true,
      visibility: true,
      title: true,
      estimatedHours: true,
      volunteersNeeded: true,
      volunteers: {
        select: { userId: true }
      }
    }
  });

  if (!taskDetails || taskDetails.parishId !== parishId) {
    throw new Error("Task not found");
  }

  const participants = new Set<string>();
  if (taskDetails.ownerId) {
    participants.add(taskDetails.ownerId);
  }
  taskDetails.volunteers.forEach((volunteer) => participants.add(volunteer.userId));

  if (participants.size === 0 && !isLeader) {
    throw new Error("Add at least one participant before completing this task.");
  }

  const hoursMode = hours?.mode ?? "estimated";
  const hasParticipants = participants.size > 0;
  // A-016: log volunteer hours when tasks are completed.
  const shouldLogHours = hoursMode !== "skip" && hasParticipants;
  const estimatedHours = taskDetails.estimatedHours ?? 0;
  const volunteersNeeded = Math.max(1, taskDetails.volunteersNeeded);
  const manualHours = hours?.manualHours ?? null;

  const hoursPerParticipant =
    hoursMode === "manual" && manualHours !== null
      ? manualHours
      : shouldLogHours
        ? calculateEstimatedHoursPerParticipant({
            estimatedHours,
            volunteersNeeded,
            participantCount: participants.size
          })
        : null;

  if (hoursMode === "manual" && manualHours === null) {
    throw new Error("Enter the hours served before completing this task.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: "DONE",
        completedAt: new Date(),
        completedById: actorUserId,
        inProgressAt: null,
        updatedByUserId: actorUserId
      }
    });

    if (shouldLogHours && hoursPerParticipant !== null) {
      await Promise.all(
        [...participants].map((participantId) =>
          tx.hoursEntry.upsert({
            where: {
              taskId_userId: {
                taskId,
                userId: participantId
              }
            },
            update: {
              hours: hoursPerParticipant,
              estimatedHours: taskDetails.estimatedHours,
              source: hoursMode === "manual" ? "MANUAL" : "ESTIMATED",
              groupId: taskDetails.groupId
            },
            create: {
              taskId,
              userId: participantId,
              parishId,
              weekId: taskDetails.weekId,
              groupId: taskDetails.groupId,
              estimatedHours: taskDetails.estimatedHours,
              hours: hoursPerParticipant,
              source: hoursMode === "manual" ? "MANUAL" : "ESTIMATED"
            }
          })
        )
      );
    }

    await tx.taskActivity.create({
      data: {
        taskId,
        actorId: actorUserId,
        description: `Marked task done${task.ownerId ? "" : " (no assignee)"}.`
      }
    });

    return updatedTask;
  });

  const completedById = updated.completedById ?? actorUserId;
  if (taskDetails.visibility === "PUBLIC" && completedById) {
    if (taskDetails.createdById && completedById !== taskDetails.createdById) {
      const recipientIds = new Set<string>();
      if (taskDetails.createdById !== completedById) {
        recipientIds.add(taskDetails.createdById);
      }
      if (taskDetails.ownerId && taskDetails.ownerId !== completedById) {
        recipientIds.add(taskDetails.ownerId);
      }

      if (recipientIds.size > 0) {
        const [recipients, memberships, completer, parish] = await Promise.all([
          prisma.user.findMany({
            where: { id: { in: [...recipientIds] } },
            select: { id: true, email: true, name: true }
          }),
          prisma.membership.findMany({
            where: { parishId, userId: { in: [...recipientIds] } },
            select: { userId: true, notifyEmailEnabled: true }
          }),
          prisma.user.findUnique({
            where: { id: completedById },
            select: { name: true }
          }),
          prisma.parish.findUnique({
            where: { id: parishId },
            select: { name: true }
          })
        ]);

        const membershipByUserId = new Map(
          memberships.map((membership) => [membership.userId, membership])
        );
        const completedByName = completer?.name ?? "Someone";
        const linkTarget = `/tasks?taskId=${taskDetails.id}`;

        await Promise.all(
          recipients.map((recipient) => {
            const membership = membershipByUserId.get(recipient.id);
            if (!membership?.notifyEmailEnabled || !recipient.email) {
              return null;
            }
            return sendTaskCompletionEmail({
              parishId,
              parishName: parish?.name ?? "",
              taskId: taskDetails.id,
              taskTitle: taskDetails.title,
              completedByName,
              recipientUserId: recipient.id,
              recipientEmail: recipient.email,
              notifyEmailEnabled: membership.notifyEmailEnabled,
              linkTarget
            });
          })
        );
      }
    }
  }

  return updated;
}

export async function unmarkTaskDone({ taskId, parishId, actorUserId }: TaskActionInput) {
  await assertTaskStatusAccess({ taskId, parishId, actorUserId });

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: "OPEN",
        completedAt: null,
        completedById: null,
        inProgressAt: null,
        updatedByUserId: actorUserId
      }
    });

    await tx.hoursEntry.deleteMany({
      where: { taskId }
    });

    await tx.taskActivity.create({
      data: {
        taskId,
        actorId: actorUserId,
        description: "Reopened the task."
      }
    });

    return updatedTask;
  });

  return updated;
}

export async function markTaskInProgress({ taskId, parishId, actorUserId }: TaskActionInput) {
  const task = await assertTaskStatusAccess({ taskId, parishId, actorUserId });

  if (task.status === "DONE") {
    throw new Error("Completed tasks cannot be started.");
  }

  if (task.visibility === "PUBLIC" && task.approvalStatus !== "APPROVED") {
    throw new Error("This task is not available to start yet.");
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "IN_PROGRESS",
      ownerId: task.volunteersNeeded > 1 ? task.ownerId : actorUserId,
      inProgressAt: new Date(),
      completedAt: null,
      completedById: null,
      updatedByUserId: actorUserId
    }
  });

  await createTaskActivity({
    taskId,
    actorUserId,
    description: "Moved task to in progress."
  });

  return updated;
}

export async function markTaskOpen({ taskId, parishId, actorUserId }: TaskActionInput) {
  await assertTaskStatusAccess({ taskId, parishId, actorUserId });

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "OPEN",
      inProgressAt: null,
      completedAt: null,
      completedById: null,
      updatedByUserId: actorUserId
    }
  });

  await createTaskActivity({
    taskId,
    actorUserId,
    description: "Reset task to open."
  });

  return updated;
}

export async function deferTask({ taskId, parishId, actorUserId, targetWeekId }: DeferTaskInput) {
  await assertTaskOwnership({ taskId, parishId, actorUserId });

  return prisma.task.update({
    where: { id: taskId },
    data: {
      weekId: targetWeekId,
      updatedByUserId: actorUserId
    }
  });
}

export async function archiveTask({ taskId, parishId, actorUserId }: TaskActionInput) {
  await assertTaskAccess({ taskId, parishId, actorUserId });

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      archivedAt: new Date(),
      updatedByUserId: actorUserId
    }
  });

  await createTaskActivity({
    taskId,
    actorUserId,
    description: "Archived the task."
  });

  return updated;
}

export async function unarchiveTask({ taskId, parishId, actorUserId }: TaskActionInput) {
  await assertTaskAccess({ taskId, parishId, actorUserId });

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      archivedAt: null,
      updatedByUserId: actorUserId
    }
  });

  await createTaskActivity({
    taskId,
    actorUserId,
    description: "Restored the task."
  });

  return updated;
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
  volunteersNeeded,
  dueAt,
  visibility
}: UpdateTaskInput) {
  const task = await assertTaskAccess({ taskId, parishId, actorUserId });
  const nextVisibility = visibility ?? task.visibility;
  let approvalStatus = task.approvalStatus;
  const previousOwnerId = task.ownerId ?? null;
  const effectiveGroupId = groupId ?? task.groupId;

  if (nextVisibility !== task.visibility) {
    if (nextVisibility === "PRIVATE") {
      approvalStatus = "APPROVED";
    } else {
      const membership = await getParishMembership(parishId, actorUserId);
      approvalStatus = membership && isParishLeader(membership.role) ? "APPROVED" : "PENDING";
    }
  }

  if (ownerId && effectiveGroupId) {
    const member = await prisma.groupMembership.findFirst({
      where: {
        groupId: effectiveGroupId,
        userId: ownerId,
        status: "ACTIVE"
      },
      select: { id: true }
    });

    if (!member) {
      throw new Error("Assignee must be a member of the selected group.");
    }
  }

  if (ownerId && ownerId !== actorUserId) {
    const parishMembership = await getParishMembership(parishId, actorUserId);
    if (!parishMembership) {
      throw new Error("Forbidden");
    }

    const groupMembership = effectiveGroupId
      ? await getGroupMembership(effectiveGroupId, actorUserId)
      : null;
    const groupRole = groupMembership?.status === "ACTIVE" ? groupMembership.role : null;
    const canManageGroup = canManageGroupMembership(parishMembership.role, groupRole);

    if (!canManageGroup) {
      throw new Error("Forbidden");
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      notes,
      estimatedHours,
      groupId,
      ownerId,
      volunteersNeeded: volunteersNeeded ?? task.volunteersNeeded,
      dueAt: dueAt ?? task.dueAt,
      visibility: nextVisibility,
      approvalStatus,
      openToVolunteers: nextVisibility === "PRIVATE" ? false : task.openToVolunteers,
      updatedByUserId: actorUserId
    }
  });

  if (ownerId !== undefined && ownerId !== previousOwnerId) {
    let description = "Updated assignment.";
    if (!ownerId) {
      description = "Unassigned the task.";
    } else if (ownerId === actorUserId) {
      description = "Assigned the task to themselves.";
    } else {
      const nextOwner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { name: true, email: true }
      });
      const nextName = nextOwner?.name ?? nextOwner?.email ?? "Member";
      description = `Assigned the task to ${nextName}.`;
    }

    await createTaskActivity({
      taskId,
      actorUserId,
      description
    });
  }

  return updated;
}

export async function setTaskCoordinator({
  taskId,
  parishId,
  actorUserId,
  coordinatorId
}: TaskActionInput & { coordinatorId: string | null }) {
  const membership = await getParishMembership(parishId, actorUserId);
  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Forbidden");
  }

  if (coordinatorId) {
    const coordinatorMembership = await prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId,
          userId: coordinatorId
        }
      },
      select: { id: true }
    });

    if (!coordinatorMembership) {
      throw new Error("Coordinator must be a parish member.");
    }
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { parishId: true }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      coordinatorId,
      updatedByUserId: actorUserId
    }
  });
}

export async function toggleTaskOpenToVolunteers({
  taskId,
  parishId,
  actorUserId,
  openToVolunteers
}: TaskActionInput & { openToVolunteers: boolean }) {
  const membership = await getParishMembership(parishId, actorUserId);
  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Forbidden");
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { parishId: true, visibility: true }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.visibility !== "PUBLIC") {
    throw new Error("Only public tasks can be opened to volunteers.");
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      openToVolunteers,
      updatedByUserId: actorUserId
    }
  });
}

export async function deleteTask({ taskId, parishId, actorUserId }: TaskActionInput) {
  await assertTaskDeleteAccess({ taskId, parishId, actorUserId });

  return prisma.task.delete({
    where: { id: taskId }
  });
}

export async function assignTaskToSelf({ taskId, parishId, actorUserId }: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      parishId: true,
      ownerId: true,
      status: true,
      groupId: true,
      visibility: true,
      approvalStatus: true,
      volunteersNeeded: true,
      openToVolunteers: true,
      coordinatorId: true
    }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.volunteersNeeded > 1) {
    throw new Error("Use volunteer flow for multi-volunteer tasks.");
  }

  if (task.status !== "OPEN") {
    throw new Error("Only open tasks can be assigned.");
  }

  if (task.visibility !== "PUBLIC" || task.approvalStatus !== "APPROVED") {
    throw new Error("This task is not available to assign yet.");
  }

  const parishMembership = await getParishMembership(parishId, actorUserId);
  if (!parishMembership) {
    throw new Error("Forbidden");
  }
  const isLeader = isParishLeader(parishMembership.role);
  const isCoordinator = task.coordinatorId === actorUserId;
  if (!task.openToVolunteers && !isLeader && !isCoordinator) {
    throw new Error("This task is not open to volunteers.");
  }

  if (task.groupId) {
    const membership = await getGroupMembership(task.groupId, actorUserId);
    if (!membership || membership.status !== "ACTIVE") {
      throw new Error("Forbidden");
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ownerId: actorUserId,
      updatedByUserId: actorUserId
    }
  });

  await createTaskActivity({
    taskId,
    actorUserId,
    description: "Assigned the task to themselves."
  });

  return updated;
}

export async function assignTaskToUser({
  taskId,
  parishId,
  actorUserId,
  ownerId
}: AssignTaskInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      parishId: true,
      ownerId: true,
      createdById: true,
      groupId: true,
      status: true,
      visibility: true,
      approvalStatus: true,
      volunteersNeeded: true,
      openToVolunteers: true,
      coordinatorId: true
    }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.ownerId) {
    throw new Error("Task is already assigned.");
  }

  if (task.volunteersNeeded > 1) {
    throw new Error("Use volunteer flow for multi-volunteer tasks.");
  }

  if (task.status !== "OPEN") {
    throw new Error("Only open tasks can be assigned.");
  }

  if (task.visibility !== "PUBLIC" || task.approvalStatus !== "APPROVED") {
    throw new Error("This task is not available to assign yet.");
  }

  const parishMembership = await getParishMembership(parishId, actorUserId);
  if (!parishMembership) {
    throw new Error("Forbidden");
  }
  const isLeader = isParishLeader(parishMembership.role);
  const isTaskCoordinator = task.coordinatorId === actorUserId;

  if (task.groupId) {
    const groupMembership = await getGroupMembership(task.groupId, actorUserId);
    const groupRole = groupMembership?.status === "ACTIVE" ? groupMembership.role : null;
    const canManageGroup = canManageGroupMembership(parishMembership.role, groupRole);
    if (!canManageGroup && !isTaskCoordinator && !isLeader) {
      throw new Error("Forbidden");
    }

    const member = await prisma.groupMembership.findFirst({
      where: {
        groupId: task.groupId,
        userId: ownerId,
        status: "ACTIVE"
      },
      select: { id: true }
    });

    if (!member) {
      throw new Error("Assignee must be a member of the selected group.");
    }
  } else if (!isLeader && !isTaskCoordinator) {
    throw new Error("Forbidden");
  }

  const member = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId: ownerId
      }
    },
    select: { id: true }
  });

  if (!member) {
    throw new Error("Assignee must be a parish member.");
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ownerId,
      updatedByUserId: actorUserId
    }
  });

  const nextOwner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { name: true, email: true }
  });
  const nextName = nextOwner?.name ?? nextOwner?.email ?? "Member";

  await createTaskActivity({
    taskId,
    actorUserId,
    description: `Assigned the task to ${nextName}.`
  });

  // Fire-and-forget push notification
  if (ownerId !== actorUserId) {
    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, email: true }
    });
    notifyTaskAssigned({
      taskId,
      taskTitle: updated.title,
      parishId,
      actorId: actorUserId,
      actorName: actor?.name ?? actor?.email ?? "Someone",
      ownerId
    }).catch(() => {});
    try {
      await notifyTaskAssignedInApp({
        taskId,
        taskTitle: updated.title,
        parishId,
        actorId: actorUserId,
        actorName: actor?.name ?? actor?.email ?? "Someone",
        ownerId
      });
    } catch (error) {
      console.error("[tasks] Failed to create in-app task assignment notification:", error);
    }
  }

  return updated;
}

export async function unassignTask({
  taskId,
  parishId,
  actorUserId
}: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      parishId: true,
      ownerId: true,
      createdById: true,
      groupId: true,
      visibility: true,
      coordinatorId: true
    }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (!task.ownerId) {
    return task;
  }

  const parishMembership = await getParishMembership(parishId, actorUserId);
  if (!parishMembership) {
    throw new Error("Forbidden");
  }
  const isLeader = isParishLeader(parishMembership.role);
  const isTaskCoordinator = task.coordinatorId === actorUserId;

  const groupMembership = task.groupId
    ? await getGroupMembership(task.groupId, actorUserId)
    : null;
  const groupRole = groupMembership?.status === "ACTIVE" ? groupMembership.role : null;
  const canManageGroup = canManageGroupMembership(parishMembership.role, groupRole);

  if (task.visibility === "PRIVATE") {
    if (!isLeader && task.createdById !== actorUserId) {
      throw new Error("Forbidden");
    }
  } else if (
    task.ownerId !== actorUserId &&
    task.createdById !== actorUserId &&
    !canManageGroup &&
    !isLeader &&
    !isTaskCoordinator
  ) {
    throw new Error("Forbidden");
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ownerId: null,
      updatedByUserId: actorUserId
    }
  });

  await createTaskActivity({
    taskId,
    actorUserId,
    description: "Unassigned the task."
  });

  return updated;
}

export async function volunteerForTask({
  taskId,
  parishId,
  actorUserId
}: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      parishId: true,
      visibility: true,
      approvalStatus: true,
      volunteersNeeded: true,
      openToVolunteers: true,
      coordinatorId: true
    }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.volunteersNeeded <= 1) {
    throw new Error("This task does not accept multiple volunteers.");
  }

  if (task.visibility !== "PUBLIC" || task.approvalStatus !== "APPROVED") {
    throw new Error("This task is not available to volunteer yet.");
  }

  const parishMembership = await getParishMembership(parishId, actorUserId);
  if (!parishMembership) {
    throw new Error("Forbidden");
  }
  const isLeader = isParishLeader(parishMembership.role);
  const isTaskCoordinator = task.coordinatorId === actorUserId;
  if (!task.openToVolunteers && !isLeader && !isTaskCoordinator) {
    throw new Error("This task is not open to volunteers.");
  }

  const currentCount = await prisma.taskVolunteer.count({
    where: { taskId }
  });

  if (currentCount >= task.volunteersNeeded) {
    throw new Error("This task is full.");
  }

  await prisma.taskVolunteer.create({
    data: {
      taskId,
      userId: actorUserId
    }
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { updatedByUserId: actorUserId }
  });

  await createTaskActivity({
    taskId,
    actorUserId,
    description: "Volunteered for the task."
  });
}

export async function leaveTaskVolunteer({
  taskId,
  parishId,
  actorUserId
}: TaskActionInput) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      parishId: true,
      volunteersNeeded: true
    }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.volunteersNeeded <= 1) {
    throw new Error("This task does not accept multiple volunteers.");
  }

  await prisma.taskVolunteer.deleteMany({
    where: {
      taskId,
      userId: actorUserId
    }
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { updatedByUserId: actorUserId }
  });

  await createTaskActivity({
    taskId,
    actorUserId,
    description: "Left the volunteer list."
  });
}

export async function removeTaskVolunteer({
  taskId,
  parishId,
  actorUserId,
  volunteerUserId
}: TaskActionInput & { volunteerUserId: string }) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      parishId: true,
      groupId: true,
      createdById: true,
      volunteersNeeded: true
    }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.volunteersNeeded <= 1) {
    throw new Error("This task does not accept multiple volunteers.");
  }

  const parishMembership = await getParishMembership(parishId, actorUserId);
  if (!parishMembership) {
    throw new Error("Forbidden");
  }

  const groupMembership = task.groupId
    ? await getGroupMembership(task.groupId, actorUserId)
    : null;
  const groupRole = groupMembership?.status === "ACTIVE" ? groupMembership.role : null;
  const canManageGroup = canManageGroupMembership(parishMembership.role, groupRole);
  const isLeader = isParishLeader(parishMembership.role);
  const isCreator = task.createdById === actorUserId;

  if (!isLeader && !canManageGroup && !isCreator && actorUserId !== volunteerUserId) {
    throw new Error("Forbidden");
  }

  await prisma.taskVolunteer.deleteMany({
    where: { taskId, userId: volunteerUserId }
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { updatedByUserId: actorUserId }
  });

  await createTaskActivity({
    taskId,
    actorUserId,
    description: "Removed a volunteer from the task."
  });
}

export async function addTaskComment({
  taskId,
  parishId,
  actorUserId,
  body,
  mentionEntities
}: TaskActionInput & { body: string; mentionEntities?: unknown }) {
  await assertTaskCommentAccess({ taskId, parishId, actorUserId });

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      authorId: actorUserId,
      body,
      mentionEntities: Array.isArray(mentionEntities) ? mentionEntities : undefined
    }
  });

  await createTaskActivity({
    taskId,
    actorUserId,
    description: "Added a comment."
  });

  return comment;
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
      volunteersNeeded: true,
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
      volunteersNeeded: task.volunteersNeeded ?? 1,
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
