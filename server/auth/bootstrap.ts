import { prisma } from "@/server/db/prisma";

export async function ensureParishBootstrap(userId: string) {
  const existingMembership = await prisma.membership.findFirst({
    where: { userId }
  });

  if (!existingMembership) {
    const existingParish = await prisma.parish.findFirst({
      orderBy: { createdAt: "asc" }
    });

    if (existingParish) {
      const membershipCount = await prisma.membership.count({
        where: { parishId: existingParish.id }
      });

      if (membershipCount === 0) {
        await prisma.membership.create({
          data: {
            parishId: existingParish.id,
            userId,
            role: "SHEPHERD"
          }
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { activeParishId: existingParish.id }
      });
      return existingParish.id;
    }

    const parish = await prisma.parish.create({
      data: {
        name: "Mother of God Ukrainian Catholic Parish",
        slug: `parish-${userId.slice(0, 8)}`
      }
    });

    await prisma.membership.create({
      data: {
        parishId: parish.id,
        userId,
        role: "SHEPHERD"
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { activeParishId: parish.id }
    });

    return parish.id;
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
