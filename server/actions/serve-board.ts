"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import {
  assignTaskToSelf,
  assignTaskToUser,
  deleteTask as deleteTaskDomain,
  leaveTaskVolunteer as leaveTaskVolunteerDomain,
  markTaskDone,
  markTaskInProgress,
  markTaskOpen,
  setTaskCoordinator,
  toggleTaskOpenToVolunteers,
  unassignTask,
  volunteerForTask as volunteerForTaskDomain
} from "@/domain/tasks";

function assertSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id, parishId: session.user.activeParishId };
}

export async function updateTaskStatus({
  taskId,
  status,
  hoursMode,
  manualHours
}: {
  taskId: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  hoursMode?: "estimated" | "manual" | "skip";
  manualHours?: number | null;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  if (status === "OPEN") {
    await markTaskOpen({ taskId, parishId, actorUserId: userId });
  } else if (status === "IN_PROGRESS") {
    await markTaskInProgress({ taskId, parishId, actorUserId: userId });
  } else {
    await markTaskDone({
      taskId,
      parishId,
      actorUserId: userId,
      hours: {
        mode: hoursMode,
        manualHours
      }
    });
  }

  revalidatePath("/serve-board");
  revalidatePath("/tasks");
}

export async function claimTask({
  taskId,
  ownerId
}: {
  taskId: string;
  ownerId?: string | null;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  if (ownerId && ownerId !== userId) {
    await assignTaskToUser({ taskId, parishId, actorUserId: userId, ownerId });
  } else {
    await assignTaskToSelf({ taskId, parishId, actorUserId: userId });
  }

  revalidatePath("/serve-board");
  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function unclaimTask({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await unassignTask({ taskId, parishId, actorUserId: userId });

  revalidatePath("/serve-board");
  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function updateCoordinator({
  taskId,
  coordinatorId
}: {
  taskId: string;
  coordinatorId: string | null;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await setTaskCoordinator({
    taskId,
    parishId,
    actorUserId: userId,
    coordinatorId
  });

  revalidatePath("/serve-board");
  revalidatePath("/tasks");
}

export async function updateOpenToVolunteers({
  taskId,
  openToVolunteers
}: {
  taskId: string;
  openToVolunteers: boolean;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await toggleTaskOpenToVolunteers({
    taskId,
    parishId,
    actorUserId: userId,
    openToVolunteers
  });

  revalidatePath("/serve-board");
  revalidatePath("/tasks");
}

export async function deleteTask({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await deleteTaskDomain({ taskId, parishId, actorUserId: userId });

  revalidatePath("/serve-board");
  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function volunteerForTask({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await volunteerForTaskDomain({ taskId, parishId, actorUserId: userId });

  revalidatePath("/serve-board");
  revalidatePath("/tasks");
  revalidatePath("/this-week");
}

export async function leaveTaskVolunteer({ taskId }: { taskId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await leaveTaskVolunteerDomain({ taskId, parishId, actorUserId: userId });

  revalidatePath("/serve-board");
  revalidatePath("/tasks");
  revalidatePath("/this-week");
}
