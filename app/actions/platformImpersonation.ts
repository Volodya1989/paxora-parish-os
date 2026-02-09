"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { requirePlatformAdmin } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export type ImpersonationActionState =
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const parishIdSchema = z.string().trim().min(1, "Parish ID is required.");

async function requirePlatformSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  await requirePlatformAdmin(session.user.id);
  return session.user.id;
}

export async function startImpersonation(parishId: string): Promise<ImpersonationActionState> {
  let userId: string;
  try {
    userId = await requirePlatformSession();
  } catch (error) {
    return { status: "error", message: "You do not have permission to impersonate." };
  }

  const parsed = parishIdSchema.safeParse(parishId);
  if (!parsed.success) {
    return { status: "error", message: "Invalid parish ID." };
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parsed.data },
    select: { id: true }
  });

  if (!parish) {
    return { status: "error", message: "Parish not found." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { impersonatedParishId: parish.id }
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: userId,
        targetParishId: parish.id,
        action: "IMPERSONATION_START"
      }
    })
  ]);

  revalidatePath("/platform/parishes");

  return { status: "success", message: "Impersonation started." };
}

export async function stopImpersonation(): Promise<ImpersonationActionState> {
  let userId: string;
  try {
    userId = await requirePlatformSession();
  } catch (error) {
    return { status: "error", message: "Unable to end impersonation." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { impersonatedParishId: true }
  });

  if (!user?.impersonatedParishId) {
    return { status: "success", message: "Impersonation already stopped." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { impersonatedParishId: null }
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: userId,
        targetParishId: user.impersonatedParishId,
        action: "IMPERSONATION_END"
      }
    })
  ]);

  revalidatePath("/platform/parishes");

  return { status: "success", message: "Impersonation ended." };
}
