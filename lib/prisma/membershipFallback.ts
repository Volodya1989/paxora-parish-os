import { randomUUID } from "node:crypto";
import { Prisma, ParishRole } from "@prisma/client";

export type MembershipDbClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

let membershipHasGreetingsColumnCache: boolean | null = null;

const isUniqueConstraintError = (error: unknown) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === "P2002") {
    return true;
  }

  if (error.code !== "P2010") {
    return false;
  }

  const dbCode = typeof error.meta?.code === "string" ? error.meta.code : "";
  return dbCode === "23505";
};

async function hasMembershipGreetingsColumn(db: MembershipDbClient) {
  if (membershipHasGreetingsColumnCache !== null) {
    return membershipHasGreetingsColumnCache;
  }

  const rows = await db.$queryRaw<Array<{ column_exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Membership'
        AND column_name = 'allowParishGreetings'
    ) AS column_exists
  `;

  const exists = rows[0]?.column_exists === true;
  membershipHasGreetingsColumnCache = exists;
  return exists;
}

async function upsertMembershipRoleWithoutGreetings(
  db: MembershipDbClient,
  params: { parishId: string; userId: string; role: ParishRole }
) {
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

async function createMembershipWithoutGreetings(db: MembershipDbClient, params: { parishId: string; userId: string }) {
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

async function upsertMembershipNotificationsWithoutGreetings(
  db: MembershipDbClient,
  params: { parishId: string; userId: string; notifyEmailEnabled: boolean; weeklyDigestEnabled: boolean }
) {
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

export async function upsertMembershipRoleWithFallback(
  db: MembershipDbClient,
  params: { parishId: string; userId: string; role: ParishRole }
) {
  if (await hasMembershipGreetingsColumn(db)) {
    return db.membership.upsert({
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
  }

  return upsertMembershipRoleWithoutGreetings(db, params);
}

export async function createMembershipMemberWithFallback(
  db: MembershipDbClient,
  params: { parishId: string; userId: string }
) {
  if (await hasMembershipGreetingsColumn(db)) {
    return db.membership.create({
      data: {
        parishId: params.parishId,
        userId: params.userId,
        role: "MEMBER"
      },
      select: { id: true }
    });
  }

  return createMembershipWithoutGreetings(db, params);
}

export async function upsertMembershipNotificationsWithFallback(
  db: MembershipDbClient,
  params: { parishId: string; userId: string; notifyEmailEnabled: boolean; weeklyDigestEnabled: boolean }
) {
  if (await hasMembershipGreetingsColumn(db)) {
    return db.membership.upsert({
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
  }

  return upsertMembershipNotificationsWithoutGreetings(db, params);
}
