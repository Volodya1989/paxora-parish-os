"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { isSuperAdmin } from "@/server/auth/super-admin";

export async function setActiveParish(parishId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { id: true }
  });

  if (!parish) {
    throw new Error("Parish not found");
  }

  const superAdmin = await isSuperAdmin(session.user.id);

  if (!superAdmin) {
    const membership = await prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId,
          userId: session.user.id
        }
      },
      select: { id: true }
    });

    if (!membership) {
      throw new Error("Forbidden");
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeParishId: parishId }
  });
}
