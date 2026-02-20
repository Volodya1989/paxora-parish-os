import { prisma } from "@/server/db/prisma";

export async function ensureParishBootstrap(userId: string) {
  const existingMembership = await prisma.membership.findFirst({
    where: { userId }
  });

  if (!existingMembership) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeParishId: true }
  });

  if (!user?.activeParishId) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeParishId: existingMembership.parishId }
    });
    return existingMembership.parishId;
  }

  return user.activeParishId;
}
