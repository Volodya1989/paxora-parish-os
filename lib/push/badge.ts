import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";

/**
 * Compute the badge count for a user within a parish.
 * Badge = unread chat messages + open tasks assigned to me + new announcements since last seen
 */
export async function getBadgeCount(userId: string, parishId: string): Promise<number> {
  const [unreadMessages, openTasksCount, newAnnouncementsCount] = await Promise.all([
    getUnreadMessageCount(userId, parishId),
    getOpenTasksAssignedCount(userId, parishId),
    getNewAnnouncementsCount(userId, parishId)
  ]);

  return unreadMessages + openTasksCount + newAnnouncementsCount;
}

async function getUnreadMessageCount(userId: string, parishId: string): Promise<number> {
  // Get all channels this user can see in this parish
  const channels = await prisma.chatChannel.findMany({
    where: { parishId },
    select: { id: true }
  });

  if (channels.length === 0) return 0;

  const channelIds = channels.map((c) => c.id);

  const rows = await prisma.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`
      SELECT COALESCE(SUM(sub.cnt), 0)::int as "count"
      FROM (
        SELECT COUNT(*)::int as cnt
        FROM "ChatMessage" m
        LEFT JOIN "ChatRoomReadState" r
          ON r."roomId" = m."channelId" AND r."userId" = ${userId}
        WHERE m."channelId" IN (${Prisma.join(channelIds)})
          AND m."authorId" != ${userId}
          AND m."deletedAt" IS NULL
          AND m."createdAt" > COALESCE(r."lastReadAt", '1970-01-01')
        GROUP BY m."channelId"
      ) sub
    `
  );

  return rows[0]?.count ?? 0;
}

async function getOpenTasksAssignedCount(userId: string, parishId: string): Promise<number> {
  return prisma.task.count({
    where: {
      parishId,
      ownerId: userId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      archivedAt: null
    }
  });
}

async function getNewAnnouncementsCount(userId: string, parishId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenAnnouncementsAt: true }
  });

  const since = user?.lastSeenAnnouncementsAt ?? new Date("1970-01-01");

  return prisma.announcement.count({
    where: {
      parishId,
      publishedAt: { not: null, gt: since },
      archivedAt: null
    }
  });
}
