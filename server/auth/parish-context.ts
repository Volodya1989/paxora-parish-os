import type { ParishRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { ensureParishBootstrap } from "@/server/auth/bootstrap";
import { selectDefaultParishId } from "@/lib/parish/selection";

export type ParishOption = {
  id: string;
  name: string;
  slug: string;
};

export type ParishContext = {
  parishId: string | null;
  parishRole: ParishRole | null;
  isSuperAdmin: boolean;
};

export async function resolveParishContext(input: {
  userId: string;
  activeParishId?: string | null;
}): Promise<ParishContext> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { activeParishId: true, isPaxoraSuperAdmin: true }
  });

  const isSuperAdmin = user?.isPaxoraSuperAdmin ?? false;
  const desiredParishId = input.activeParishId ?? user?.activeParishId ?? null;

  if (desiredParishId) {
    const parish = await prisma.parish.findUnique({
      where: { id: desiredParishId },
      select: { id: true }
    });

    if (parish?.id) {
      if (isSuperAdmin) {
        return { parishId: parish.id, parishRole: "ADMIN", isSuperAdmin };
      }

      const membership = await prisma.membership.findUnique({
        where: { parishId_userId: { parishId: parish.id, userId: input.userId } },
        select: { role: true }
      });

      if (membership) {
        return { parishId: parish.id, parishRole: membership.role, isSuperAdmin };
      }
    }
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "asc" },
    select: { parishId: true, role: true }
  });

  if (memberships.length > 0) {
    const activeParishCandidate = memberships.some(
      (membership) => membership.parishId === desiredParishId
    )
      ? desiredParishId
      : null;
    const nextParishId = selectDefaultParishId({
      activeParishId: activeParishCandidate,
      memberships
    });

    const nextMembership = memberships.find((membership) => membership.parishId === nextParishId);

    if (nextParishId && user?.activeParishId !== nextParishId) {
      await prisma.user.update({
        where: { id: input.userId },
        data: { activeParishId: nextParishId }
      });
    }

    return {
      parishId: nextParishId,
      parishRole: nextMembership?.role ?? null,
      isSuperAdmin
    };
  }

  if (isSuperAdmin) {
    const parish = await prisma.parish.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });

    if (parish?.id) {
      if (user?.activeParishId !== parish.id) {
        await prisma.user.update({
          where: { id: input.userId },
          data: { activeParishId: parish.id }
        });
      }

      return { parishId: parish.id, parishRole: "ADMIN", isSuperAdmin };
    }

    return { parishId: null, parishRole: "ADMIN", isSuperAdmin };
  }

  const bootstrapParishId = await ensureParishBootstrap(input.userId);

  return { parishId: bootstrapParishId, parishRole: "SHEPHERD", isSuperAdmin };
}

export async function listParishOptions(input: {
  userId: string;
  isSuperAdmin: boolean;
}): Promise<ParishOption[]> {
  if (input.isSuperAdmin) {
    return prisma.parish.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true }
    });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: input.userId },
    orderBy: { parish: { name: "asc" } },
    select: {
      parish: {
        select: { id: true, name: true, slug: true }
      }
    }
  });

  return memberships.map((membership) => membership.parish);
}
