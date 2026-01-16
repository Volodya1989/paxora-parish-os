"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { createTask as createTaskDomain } from "@/domain/tasks";
import { isParishLeader } from "@/lib/permissions";
import { createGroupTaskSchema } from "@/lib/validation/tasks";
import { prisma } from "@/server/db/prisma";

function assertSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id, parishId: session.user.activeParishId };
}

export async function createGroupTask(formData: FormData) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = createGroupTaskSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    weekId: formData.get("weekId"),
    groupId: formData.get("groupId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const group = await prisma.group.findFirst({
    where: {
      id: parsed.data.groupId,
      parishId
    },
    select: { id: true }
  });

  if (!group) {
    throw new Error("Group not found");
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
    throw new Error("Unauthorized");
  }

  const visibility = "PUBLIC";
  const approvalStatus = isParishLeader(membership.role) ? "APPROVED" : "PENDING";

  await createTaskDomain({
    parishId,
    weekId: parsed.data.weekId,
    ownerId: userId,
    createdById: userId,
    groupId: parsed.data.groupId,
    title: parsed.data.title,
    notes: parsed.data.notes,
    visibility,
    approvalStatus
  });

  revalidatePath(`/groups/${parsed.data.groupId}`);
}
