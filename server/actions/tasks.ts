"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import {
  createTask as createTaskDomain,
  deferTask as deferTaskDomain,
  markTaskDone as markTaskDoneDomain,
  rolloverOpenTasks
} from "@/domain/tasks";
import {
  createTaskSchema,
  deferTaskSchema,
  markTaskDoneSchema,
  rolloverTasksSchema
} from "@/lib/validation/tasks";

function assertSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id, parishId: session.user.activeParishId };
}

export async function createTask(formData: FormData) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    weekId: formData.get("weekId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await createTaskDomain({
    parishId,
    weekId: parsed.data.weekId,
    ownerId: userId,
    title: parsed.data.title,
    notes: parsed.data.notes
  });

  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function markTaskDone(formData: FormData) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = markTaskDoneSchema.safeParse({
    taskId: formData.get("taskId")
  });

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
