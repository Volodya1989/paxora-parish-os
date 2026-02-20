import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import { listEligibleChatChannelsForUser } from "@/lib/notifications/chat-membership";

/**
 * Compute the badge count for a user within a parish.
 * Badge = unread chat messages + new tasks (since last seen) + new announcements + new events
 */
export async function getBadgeCount(userId: string, parishId: string): Promise<number> {
  const [unreadMessages, newTasksCount, newAnnouncementsCount, newEventsCount] = await Promise.all([
    getUnreadMessageCount(userId, parishId),
    getNewTasksCount(userId, parishId),
    getNewAnnouncementsCount(userId, parishId),
    getNewEventsCount(userId, parishId)
  ]);

  return unreadMessages + newTasksCount + newAnnouncementsCount + newEventsCount;
}

async function getUnreadMessageCount(userId: string, parishId: string): Promise<number> {
  const channels = await listEligibleChatChannelsForUser({ userId, parishId });
  if (channels.length === 0) return 0;

  const rows = await prisma.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`
      SELECT COALESCE(SUM(sub.cnt), 0)::int as "count"
      FROM (
        SELECT COUNT(*)::int as cnt
        FROM "ChatMessage" m
        LEFT JOIN "ChatRoomReadState" r
          ON r."roomId" = m."channelId" AND r."userId" = ${userId}
        WHERE ${Prisma.join(
          channels.map(
            (channel) => Prisma.sql`(m."channelId" = ${channel.channelId} AND m."createdAt" >= ${channel.joinedAt})`
          ),
          " OR "
        )}
          AND m."authorId" != ${userId}
          AND m."deletedAt" IS NULL
          AND m."createdAt" > COALESCE(r."lastReadAt", '1970-01-01')
        GROUP BY m."channelId"
      ) sub
    `
  );

  return rows[0]?.count ?? 0;
}

async function getNewTasksCount(userId: string, parishId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenTasksAt: true, createdAt: true }
  });

  const since = user?.lastSeenTasksAt ?? user?.createdAt ?? new Date();

  return prisma.task.count({
    where: {
      parishId,
      ownerId: userId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      archivedAt: null,
      createdAt: { gt: since }
    }
  });
}

async function getNewAnnouncementsCount(userId: string, parishId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenAnnouncementsAt: true, createdAt: true }
  });

  const since = user?.lastSeenAnnouncementsAt ?? user?.createdAt ?? new Date();

  return prisma.announcement.count({
    where: {
      parishId,
      publishedAt: { not: null, gt: since },
      archivedAt: null
    }
  });
}

async function getNewEventsCount(userId: string, parishId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenEventsAt: true, createdAt: true }
  });

  const since = user?.lastSeenEventsAt ?? user?.createdAt ?? new Date();

  return prisma.event.count({
    where: {
      parishId,
      deletedAt: null,
      createdAt: { gt: since },
      visibility: { in: ["PUBLIC", "GROUP"] }
    }
  });
}
