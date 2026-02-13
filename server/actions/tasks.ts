"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import {
  archiveTask as archiveTaskDomain,
  createTask as createTaskDomain,
  assignTaskToSelf as assignTaskToSelfDomain,
  assignTaskToUser as assignTaskToUserDomain,
  addTaskComment as addTaskCommentDomain,
  deferTask as deferTaskDomain,
  deleteTask as deleteTaskDomain,
  leaveTaskVolunteer as leaveTaskVolunteerDomain,
  markTaskDone as markTaskDoneDomain,
  markTaskInProgress as markTaskInProgressDomain,
  markTaskOpen as markTaskOpenDomain,
  removeTaskVolunteer as removeTaskVolunteerDomain,
  rolloverOpenTasks,
  unassignTask as unassignTaskDomain,
  unarchiveTask as unarchiveTaskDomain,
  unmarkTaskDone as unmarkTaskDoneDomain,
  updateTask as updateTaskDomain,
  volunteerForTask as volunteerForTaskDomain
} from "@/domain/tasks";
import { isParishLeader } from "@/lib/permissions";
import {
  archiveTaskSchema,
  assignTaskSchema,
  approveTaskSchema,
  createTaskSchema,
  markTaskDoneSchema,
  deferTaskSchema,
  deleteTaskSchema,
  markTaskInProgressSchema,
  markTaskOpenSchema,
  rejectTaskSchema,
  rolloverTasksSchema,
  unarchiveTaskSchema,
  unmarkTaskDoneSchema,
  updateTaskSchema
} from "@/lib/validation/tasks";
import type { TaskActionState } from "@/server/actions/taskState";
import { prisma } from "@/server/db/prisma";
import { getTaskDetail as getTaskDetailQuery } from "@/lib/queries/tasks";
import { extractMentionedUserIds, mentionSnippet, normalizeMentionEntities } from "@/lib/mentions";
import { listMentionableUsersForTask } from "@/lib/mentions/permissions";
import { notifyMentionInApp } from "@/lib/notifications/notify";
import { notifyMention } from "@/lib/push/notify";

function assertSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id, parishId: session.user.activeParishId };
}

function fd(formData: FormData, key: string) {
  const v = formData.get(key);
  if (v === null) return undefined; // null -> undefined (critical for zod optional)
  if (typeof v === "string" && v.trim() === "") return undefined; // "" -> undefined
  return v;
}


export async function createTask(
  _: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = createTaskSchema.safeParse({
    title: fd(formData, "title"),
    notes: fd(formData, "notes"),
    estimatedHours: fd(formData, "estimatedHours"),
    weekId: fd(formData, "weekId"),
    groupId: fd(formData, "groupId"),
    ownerId: fd(formData, "ownerId"),
    volunteersNeeded: fd(formData, "volunteersNeeded"),
    dueAt: fd(formData, "dueAt"),
    visibility: fd(formData, "visibility")
  });

  const creationContext = fd(formData, "creationContext") === "my_commitments" ? "my_commitments" : "default";


  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.errors[0]?.message ?? "Invalid input"
    };
  }

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId
      }
    },
    select: { role: true }
  });

  if (!membership) {
    return {
      status: "error",
      message: "You must be a parish member to create tasks."
    };
  }

  if (parsed.data.ownerId && parsed.data.ownerId !== userId) {
    if (isParishLeader(membership.role)) {
      // Allowed.
    } else if (parsed.data.groupId) {
      const actorGroupMembership = await prisma.groupMembership.findFirst({
        where: {
          groupId: parsed.data.groupId,
          userId,
          status: "ACTIVE"
        },
        select: { role: true }
      });

      if (actorGroupMembership?.role !== "COORDINATOR") {
        return {
          status: "error",
          message: "Only group coordinators or parish leaders can assign others."
        };
      }
    } else {
      return {
        status: "error",
        message: "Only parish leaders can assign others."
      };
    }
  }

  if (parsed.data.groupId && parsed.data.ownerId) {
    const groupMember = await prisma.groupMembership.findFirst({
      where: {
        groupId: parsed.data.groupId,
        userId: parsed.data.ownerId,
        status: "ACTIVE"
      },
      select: { id: true }
    });

    if (!groupMember) {
      return {
        status: "error",
        message: "Assignee must be a member of the selected group."
      };
    }
  }

  const requestedVisibility = parsed.data.visibility === "public" ? "PUBLIC" : "PRIVATE";
  const visibility =
    creationContext === "my_commitments" && membership.role === "MEMBER"
      ? "PRIVATE"
      : requestedVisibility;
  const approvalStatus =
    visibility === "PRIVATE" || isParishLeader(membership.role) ? "APPROVED" : "PENDING";
  const volunteersNeeded = visibility === "PRIVATE" ? 1 : parsed.data.volunteersNeeded;
  const openToVolunteers = visibility === "PUBLIC";
  const ownerId =
    visibility === "PRIVATE"
      ? parsed.data.ownerId ?? userId
      : parsed.data.ownerId ??
      (parsed.data.volunteersNeeded && parsed.data.volunteersNeeded > 1 ? undefined : userId);
  const defaultDueAt = new Date();
  defaultDueAt.setDate(defaultDueAt.getDate() + 14);

  await createTaskDomain({
    parishId,
    weekId: parsed.data.weekId,
    ownerId,
    createdById: userId,
    title: parsed.data.title,
    notes: parsed.data.notes,
    estimatedHours: parsed.data.estimatedHours,
    volunteersNeeded,
    groupId: parsed.data.groupId,
    dueAt: parsed.data.dueAt ?? defaultDueAt,
    visibility,
    openToVolunteers,
    approvalStatus
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");

  return {
    status: "success",
    message:
      approvalStatus === "PENDING"
        ? "Your task is submitted for approval."
        : "Your task is ready for the team."
  };
}

export async function assignTaskToSelf({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskDoneSchema.safeParse({ taskId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await assignTaskToSelfDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function assignTaskToUser({
  taskId,
  ownerId
}: {
  taskId: string;
  ownerId: string;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = assignTaskSchema.safeParse({ taskId, ownerId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await assignTaskToUserDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId,
    ownerId: parsed.data.ownerId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function unassignTask({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskDoneSchema.safeParse({ taskId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await unassignTaskDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function volunteerForTask({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskDoneSchema.safeParse({ taskId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await volunteerForTaskDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId
  });

  revalidatePath("/tasks");
}

export async function leaveTaskVolunteer({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskDoneSchema.safeParse({ taskId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await leaveTaskVolunteerDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId
  });

  revalidatePath("/tasks");
}

export async function removeTaskVolunteer({
  taskId,
  volunteerUserId
}: {
  taskId: string;
  volunteerUserId: string;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskDoneSchema.safeParse({ taskId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  if (!volunteerUserId) {
    throw new Error("Volunteer is required.");
  }

  await removeTaskVolunteerDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId,
    volunteerUserId
  });

  revalidatePath("/tasks");
}

export async function addTaskComment({
  taskId,
  body,
  mentionEntities
}: {
  taskId: string;
  body: string;
  mentionEntities?: unknown;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskDoneSchema.safeParse({ taskId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  if (!body.trim()) {
    throw new Error("Comment is required.");
  }

  const normalizedMentions = normalizeMentionEntities(mentionEntities);

  const comment = await addTaskCommentDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId,
    body: body.trim(),
    mentionEntities: normalizedMentions
  });

  const mentionUserIds = extractMentionedUserIds(body.trim(), normalizedMentions);
  if (mentionUserIds.length > 0) {
    const mentionable = await listMentionableUsersForTask({ parishId, actorUserId: userId, taskId: parsed.data.taskId, query: "" });
    const allowedIds = new Set(mentionable.map((user) => user.id));
    const recipients = mentionUserIds.filter((id) => allowedIds.has(id) && id !== userId);

    if (recipients.length > 0) {
      const href = `/tasks?taskId=${parsed.data.taskId}&comment=${comment.id}`;
      await prisma.mention.createMany({
        data: recipients.map((mentionedUserId) => ({
          parishId,
          mentionedUserId,
          actorUserId: userId,
          contextType: "TASK_COMMENT",
          contextId: comment.id,
          snippet: mentionSnippet(body.trim()),
          href
        }))
      });

      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      const actorName = actor?.name ?? actor?.email ?? "Parish member";

      await notifyMentionInApp({
        parishId,
        recipientIds: recipients,
        actorName,
        description: `Serve card comment: ${mentionSnippet(body.trim())}`,
        href
      });

      notifyMention({
        parishId,
        recipientIds: recipients,
        actorName,
        contextLabel: "Serve comment mention",
        href
      }).catch(() => {});
    }
  }

  revalidatePath("/tasks");
}

export async function getTaskDetail({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId } = assertSession(session);

  const parsed = markTaskDoneSchema.safeParse({ taskId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  return getTaskDetailQuery({ taskId: parsed.data.taskId, actorUserId: userId });
}

export async function markTaskDone({
  taskId,
  hoursMode,
  manualHours
}: {
  taskId: string;
  hoursMode?: "estimated" | "manual" | "skip";
  manualHours?: number | null;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskDoneSchema.safeParse({ taskId, hoursMode, manualHours });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await markTaskDoneDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId,
    hours: {
      mode: parsed.data.hoursMode,
      manualHours: parsed.data.manualHours
    }
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function markTaskInProgress({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskInProgressSchema.safeParse({ taskId });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await markTaskInProgressDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function markTaskOpen({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskOpenSchema.safeParse({ taskId });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await markTaskOpenDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function unmarkTaskDone({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = unmarkTaskDoneSchema.safeParse({ taskId });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await unmarkTaskDoneDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function archiveTask({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = archiveTaskSchema.safeParse({ taskId });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await archiveTaskDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function updateTask(
  _: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = updateTaskSchema.safeParse({
    taskId: formData.get("taskId"),
    title: formData.get("title"),
    notes: formData.get("notes"),
    estimatedHours: formData.get("estimatedHours"),
    groupId: formData.get("groupId"),
    ownerId: formData.get("ownerId"),
    volunteersNeeded: formData.get("volunteersNeeded"),
    dueAt: formData.get("dueAt"),
    visibility: formData.get("visibility")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.errors[0]?.message ?? "Invalid input"
    };
  }

  const editContext = formData.get("editContext") === "my_commitments" ? "my_commitments" : "default";

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId
      }
    },
    select: { role: true }
  });

  if (!membership) {
    return {
      status: "error",
      message: "You must be a parish member to update tasks."
    };
  }

  const visibility =
    editContext === "my_commitments" && membership.role === "MEMBER"
      ? "PRIVATE"
      : parsed.data.visibility === "private"
        ? "PRIVATE"
        : "PUBLIC";

  await updateTaskDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId,
    title: parsed.data.title,
    notes: parsed.data.notes,
    estimatedHours: parsed.data.estimatedHours,
    groupId: parsed.data.groupId,
    ownerId: parsed.data.ownerId,
    volunteersNeeded: parsed.data.volunteersNeeded,
    dueAt: parsed.data.dueAt,
    visibility
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");

  return { status: "success" };
}

export async function deleteTask({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = deleteTaskSchema.safeParse({ taskId });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await deleteTaskDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function unarchiveTask({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = unarchiveTaskSchema.safeParse({ taskId });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await unarchiveTaskDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function approveTask({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = approveTaskSchema.safeParse({ taskId });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId
      }
    },
    select: { role: true }
  });

  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Unauthorized");
  }

  const task = await prisma.task.findUnique({
    where: { id: parsed.data.taskId },
    select: { parishId: true, visibility: true, approvalStatus: true }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.visibility !== "PUBLIC") {
    throw new Error("Only public tasks can be approved.");
  }

  if (task.approvalStatus !== "PENDING") {
    throw new Error("Task is not pending approval.");
  }

  await prisma.task.update({
    where: { id: parsed.data.taskId },
    data: { approvalStatus: "APPROVED" }
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function rejectTask({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = rejectTaskSchema.safeParse({ taskId });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId
      }
    },
    select: { role: true }
  });

  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Unauthorized");
  }

  const task = await prisma.task.findUnique({
    where: { id: parsed.data.taskId },
    select: { parishId: true, visibility: true, approvalStatus: true }
  });

  if (!task || task.parishId !== parishId) {
    throw new Error("Task not found");
  }

  if (task.visibility !== "PUBLIC") {
    throw new Error("Only public tasks can be rejected.");
  }

  if (task.approvalStatus !== "PENDING") {
    throw new Error("Task is not pending approval.");
  }

  await prisma.task.update({
    where: { id: parsed.data.taskId },
    data: { approvalStatus: "REJECTED" }
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function deferTask(formData: FormData) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = deferTaskSchema.safeParse({
    taskId: formData.get("taskId"),
    targetWeekId: formData.get("targetWeekId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await deferTaskDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId,
    targetWeekId: parsed.data.targetWeekId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function rolloverTasksForWeek(formData: FormData) {
  const session = await getServerSession(authOptions);
  const { parishId } = assertSession(session);

  const parsed = rolloverTasksSchema.safeParse({
    fromWeekId: formData.get("fromWeekId"),
    toWeekId: formData.get("toWeekId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await rolloverOpenTasks({
    parishId,
    fromWeekId: parsed.data.fromWeekId,
    toWeekId: parsed.data.toWeekId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}
