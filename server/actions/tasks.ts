"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import {
  archiveTask as archiveTaskDomain,
  createTask as createTaskDomain,
  deferTask as deferTaskDomain,
  markTaskDone as markTaskDoneDomain,
  rolloverOpenTasks,
  unarchiveTask as unarchiveTaskDomain,
  unmarkTaskDone as unmarkTaskDoneDomain
} from "@/domain/tasks";
import {
  archiveTaskSchema,
  createTaskSchema,
  deferTaskSchema,
  markTaskDoneSchema,
  rolloverTasksSchema,
  unarchiveTaskSchema,
  unmarkTaskDoneSchema
} from "@/lib/validation/tasks";

function assertSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id, parishId: session.user.activeParishId };
}

export type TaskActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialTaskActionState: TaskActionState = {
  status: "idle"
};

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
    ownerId: formData.get("ownerId")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.errors[0]?.message ?? "Invalid input"
    };
  }

  await createTaskDomain({
    parishId,
    weekId: parsed.data.weekId,
    ownerId: parsed.data.ownerId ?? userId,
    title: parsed.data.title,
    notes: parsed.data.notes,
    groupId: parsed.data.groupId
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");

  return { status: "success" };
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

const taskActions = {
  createTask,
  markTaskDone,
  unmarkTaskDone,
  archiveTask,
  unarchiveTask,
  deferTask,
  rolloverTasksForWeek,
  initialTaskActionState
};

export default taskActions;
