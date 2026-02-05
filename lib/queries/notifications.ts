import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";

export type NotificationCategory = "message" | "task" | "announcement" | "event";

export type NotificationItem = {
  id: string;
  type: NotificationCategory;
  title: string;
  description: string;
  href: string;
  timestamp: string;
};

export type NotificationsResult = {
  items: NotificationItem[];
  count: number;
};

/**
 * Aggregate all notification items for a user within a parish.
 * Items are sourced from existing domain data:
 *  - Unread chat messages (grouped by channel)
 *  - New tasks assigned (since lastSeenTasksAt)
 *  - New announcements (since lastSeenAnnouncementsAt)
 *  - New events (since lastSeenEventsAt)
 */
export async function getNotificationItems(
  userId: string,
  parishId: string
): Promise<NotificationsResult> {
  const [messages, tasks, announcements, events] = await Promise.all([
    getUnreadMessageItems(userId, parishId),
    getNewTaskItems(userId, parishId),
    getNewAnnouncementItems(userId, parishId),
    getNewEventItems(userId, parishId)
  ]);

  const items = [...messages, ...tasks, ...announcements, ...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return { items, count: items.length };
}

async function getUnreadMessageItems(
  userId: string,
  parishId: string
): Promise<NotificationItem[]> {
  const channels = await prisma.chatChannel.findMany({
    where: { parishId },
    select: { id: true, name: true }
  });

  if (channels.length === 0) return [];

  const channelIds = channels.map((c) => c.id);
  const channelMap = new Map(channels.map((c) => [c.id, c.name]));

  const rows = await prisma.$queryRaw<
    Array<{ channelId: string; cnt: number; latestBody: string; latestAt: Date }>
  >(
    Prisma.sql`
      SELECT
        m."channelId",
        COUNT(*)::int AS cnt,
        (
          SELECT m2."body"
          FROM "ChatMessage" m2
          WHERE m2."channelId" = m."channelId"
            AND m2."authorId" != ${userId}
            AND m2."deletedAt" IS NULL
          ORDER BY m2."createdAt" DESC
          LIMIT 1
        ) AS "latestBody",
        MAX(m."createdAt") AS "latestAt"
      FROM "ChatMessage" m
      LEFT JOIN "ChatRoomReadState" r
        ON r."roomId" = m."channelId" AND r."userId" = ${userId}
      WHERE m."channelId" IN (${Prisma.join(channelIds)})
        AND m."authorId" != ${userId}
        AND m."deletedAt" IS NULL
        AND m."createdAt" > COALESCE(r."lastReadAt", '1970-01-01')
      GROUP BY m."channelId"
      HAVING COUNT(*) > 0
    `
  );

  return rows.map((row) => {
    const channelName = channelMap.get(row.channelId) ?? "Chat";
    const body = row.latestBody ?? "";
    const preview = body.length > 80 ? `${body.slice(0, 77)}...` : body;
    return {
      id: `msg-${row.channelId}`,
      type: "message" as const,
      title:
        row.cnt === 1
          ? `New message in ${channelName}`
          : `${row.cnt} new messages in ${channelName}`,
      description: preview,
      href: `/community/chat?channel=${row.channelId}`,
      timestamp: row.latestAt.toISOString()
    };
  });
}

async function getNewTaskItems(
  userId: string,
  parishId: string
): Promise<NotificationItem[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenTasksAt: true }
  });

  const since = user?.lastSeenTasksAt ?? new Date("1970-01-01");

  const tasks = await prisma.task.findMany({
    where: {
      parishId,
      ownerId: userId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      archivedAt: null,
      createdAt: { gt: since }
    },
    select: {
      id: true,
      title: true,
      notes: true,
      createdAt: true,
      group: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return tasks.map((task) => ({
    id: `task-${task.id}`,
    type: "task" as const,
    title: task.title,
    description: task.group?.name
      ? `Serve task in ${task.group.name}`
      : "Serve task assigned to you",
    href: `/tasks?taskId=${task.id}`,
    timestamp: task.createdAt.toISOString()
  }));
}

async function getNewAnnouncementItems(
  userId: string,
  parishId: string
): Promise<NotificationItem[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenAnnouncementsAt: true }
  });

  const since = user?.lastSeenAnnouncementsAt ?? new Date("1970-01-01");

  const announcements = await prisma.announcement.findMany({
    where: {
      parishId,
      publishedAt: { not: null, gt: since },
      archivedAt: null
    },
    select: {
      id: true,
      title: true,
      body: true,
      publishedAt: true
    },
    orderBy: { publishedAt: "desc" },
    take: 20
  });

  return announcements.map((ann) => {
    const preview = ann.body
      ? ann.body.length > 80
        ? `${ann.body.slice(0, 77)}...`
        : ann.body
      : "";
    return {
      id: `ann-${ann.id}`,
      type: "announcement" as const,
      title: ann.title,
      description: preview,
      href: "/announcements",
      timestamp: (ann.publishedAt ?? new Date()).toISOString()
    };
  });
}

async function getNewEventItems(
  userId: string,
  parishId: string
): Promise<NotificationItem[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenEventsAt: true }
  });

  const since = user?.lastSeenEventsAt ?? new Date("1970-01-01");

  const events = await prisma.event.findMany({
    where: {
      parishId,
      startsAt: { gt: since },
      visibility: { in: ["PUBLIC", "GROUP"] }
    },
    select: {
      id: true,
      title: true,
      location: true,
      startsAt: true,
      group: { select: { name: true } }
    },
    orderBy: { startsAt: "desc" },
    take: 20
  });

  return events.map((evt) => ({
    id: `evt-${evt.id}`,
    type: "event" as const,
    title: evt.title,
    description: evt.group?.name
      ? `Event in ${evt.group.name}`
      : evt.location ?? "New event",
    href: "/calendar",
    timestamp: evt.startsAt.toISOString()
  }));
}
