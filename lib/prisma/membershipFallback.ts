import { randomUUID } from "node:crypto";
import { Prisma, ParishRole } from "@prisma/client";
import { isMissingColumnError } from "@/lib/prisma/errors";

export type MembershipDbClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

function isMissingMembershipGreetingsColumn(error: unknown) {
  return isMissingColumnError(error, "Membership.allowParishGreetings") || isMissingColumnError(error);
}

export async function upsertMembershipRoleWithFallback(
  db: MembershipDbClient,
  params: { parishId: string; userId: string; role: ParishRole }
) {
  try {
    return await db.membership.upsert({
      where: {
        parishId_userId: {
          parishId: params.parishId,
          userId: params.userId
        }
      },
      update: { role: params.role },
      create: {
        parishId: params.parishId,
        userId: params.userId,
        role: params.role
      },
      select: { id: true }
    });
  } catch (error) {
    if (!isMissingMembershipGreetingsColumn(error)) {
      throw error;
    }

    const updatedRows = await db.$executeRaw`
      UPDATE "Membership"
      SET "role" = ${params.role}
      WHERE "parishId" = ${params.parishId} AND "userId" = ${params.userId}
    `;

    if (updatedRows > 0) {
      return { id: null };
    }

    try {
      await db.$executeRaw`
        INSERT INTO "Membership" ("id", "parishId", "userId", "role", "notifyEmailEnabled", "weeklyDigestEnabled", "createdAt")
        VALUES (${randomUUID()}, ${params.parishId}, ${params.userId}, ${params.role}::"ParishRole", true, true, NOW())
      `;
    } catch (insertError) {
      if (!isUniqueConstraintError(insertError)) {
        throw insertError;
      }
    }

    return { id: null };
  }
}

export async function createMembershipMemberWithFallback(
  db: MembershipDbClient,
  params: { parishId: string; userId: string }
) {
  try {
    return await db.membership.create({
      data: {
        parishId: params.parishId,
        userId: params.userId,
        role: "MEMBER"
      },
      select: { id: true }
    });
  } catch (error) {
    if (!isMissingMembershipGreetingsColumn(error)) {
      throw error;
    }

    try {
      await db.$executeRaw`
        INSERT INTO "Membership" ("id", "parishId", "userId", "role", "notifyEmailEnabled", "weeklyDigestEnabled", "createdAt")
        VALUES (${randomUUID()}, ${params.parishId}, ${params.userId}, ${"MEMBER"}::"ParishRole", true, true, NOW())
      `;
    } catch (insertError) {
      if (!isUniqueConstraintError(insertError)) {
        throw insertError;
      }
    }

    return { id: null };
  }
}

export async function upsertMembershipNotificationsWithFallback(
  db: MembershipDbClient,
  params: { parishId: string; userId: string; notifyEmailEnabled: boolean; weeklyDigestEnabled: boolean }
) {
  try {
    return await db.membership.upsert({
      where: {
        parishId_userId: {
          parishId: params.parishId,
          userId: params.userId
        }
      },
      update: {
        notifyEmailEnabled: params.notifyEmailEnabled,
        weeklyDigestEnabled: params.weeklyDigestEnabled
      },
      create: {
        parishId: params.parishId,
        userId: params.userId,
        notifyEmailEnabled: params.notifyEmailEnabled,
        weeklyDigestEnabled: params.weeklyDigestEnabled
      },
      select: {
        notifyEmailEnabled: true,
        weeklyDigestEnabled: true
      }
    });
  } catch (error) {
    if (!isMissingMembershipGreetingsColumn(error)) {
      throw error;
    }

    const updatedRows = await db.$executeRaw`
      UPDATE "Membership"
      SET "notifyEmailEnabled" = ${params.notifyEmailEnabled}, "weeklyDigestEnabled" = ${params.weeklyDigestEnabled}
      WHERE "parishId" = ${params.parishId} AND "userId" = ${params.userId}
    `;

    if (updatedRows === 0) {
      try {
        await db.$executeRaw`
          INSERT INTO "Membership" ("id", "parishId", "userId", "role", "notifyEmailEnabled", "weeklyDigestEnabled", "createdAt")
          VALUES (${randomUUID()}, ${params.parishId}, ${params.userId}, ${"MEMBER"}::"ParishRole", ${params.notifyEmailEnabled}, ${params.weeklyDigestEnabled}, NOW())
        `;
      } catch (insertError) {
        if (!isUniqueConstraintError(insertError)) {
          throw insertError;
        }
      }
    }

    return {
      notifyEmailEnabled: params.notifyEmailEnabled,
      weeklyDigestEnabled: params.weeklyDigestEnabled
    };
  }
}
