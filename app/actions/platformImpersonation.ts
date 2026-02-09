"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { requirePlatformAdmin } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export type ImpersonationActionState =
  | { status: "success"; message: string }
  | { status: "error"; message: string };

async function requirePlatformSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  await requirePlatformAdmin(session.user.id);
  return session.user.id;
}

export async function startImpersonation(parishId: string): Promise<ImpersonationActionState> {
  try {
    const userId = await requirePlatformSession();
    const parish = await prisma.parish.findUnique({
      where: { id: parishId },
      select: { id: true }
    });

    if (!parish) {
      return { status: "error", message: "Parish not found." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { impersonatedParishId: parish.id }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        targetParishId: parish.id,
        action: "IMPERSONATION_START"
      }
    });

    revalidatePath("/platform/parishes");

    return { status: "success", message: "Impersonation started." };
  } catch (error) {
    return { status: "error", message: "You do not have permission to impersonate." };
  }
}

export async function stopImpersonation(): Promise<ImpersonationActionState> {
  try {
    const userId = await requirePlatformSession();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { impersonatedParishId: true }
    });

    if (!user?.impersonatedParishId) {
      return { status: "success", message: "Impersonation already stopped." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { impersonatedParishId: null }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        targetParishId: user.impersonatedParishId,
        action: "IMPERSONATION_END"
      }
    });

    revalidatePath("/platform/parishes");

    return { status: "success", message: "Impersonation ended." };
  } catch (error) {
    return { status: "error", message: "Unable to end impersonation." };
  }
}
