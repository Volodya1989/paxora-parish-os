"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import {
  archiveTask as archiveTaskDomain,
  createTask as createTaskDomain,
  deferTask as deferTaskDomain,
  deleteTask as deleteTaskDomain,
  markTaskDone as markTaskDoneDomain,
  rolloverOpenTasks,
  unarchiveTask as unarchiveTaskDomain,
  unmarkTaskDone as unmarkTaskDoneDomain,
  updateTask as updateTaskDomain
} from "@/domain/tasks";
import { isParishLeader } from "@/lib/permissions";
import {
  archiveTaskSchema,
  approveTaskSchema,
  createTaskSchema,
  deferTaskSchema,
  deleteTaskSchema,
  markTaskDoneSchema,
  rejectTaskSchema,
  rolloverTasksSchema,
  unarchiveTaskSchema,
  unmarkTaskDoneSchema,
  updateTaskSchema
} from "@/lib/validation/tasks";
import type { TaskActionState } from "@/server/actions/taskState";
import { prisma } from "@/server/db/prisma";

function assertSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id, parishId: session.user.activeParishId };
}

export async function createTask(
  _: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    weekId: formData.get("weekId"),
    groupId: formData.get("groupId"),
    ownerId: formData.get("ownerId"),
    visibility: formData.get("visibility")
  });

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

  const visibility = parsed.data.visibility === "private" ? "PRIVATE" : "PUBLIC";
  const approvalStatus =
    visibility === "PRIVATE" || isParishLeader(membership.role) ? "APPROVED" : "PENDING";

  await createTaskDomain({
    parishId,
    weekId: parsed.data.weekId,
    ownerId: parsed.data.ownerId ?? userId,
    createdById: userId,
    title: parsed.data.title,
    notes: parsed.data.notes,
    groupId: parsed.data.groupId,
    visibility,
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

export async function markTaskDone({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskDoneSchema.safeParse({ taskId });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await markTaskDoneDomain({
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
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.errors[0]?.message ?? "Invalid input"
    };
  }

  await updateTaskDomain({
    taskId: parsed.data.taskId,
    parishId,
    actorUserId: userId,
    title: parsed.data.title,
    notes: parsed.data.notes
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
