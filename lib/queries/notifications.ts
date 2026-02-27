import { prisma } from "@/server/db/prisma";
import { buildAnnouncementVisibilityWhere } from "@/lib/announcements/access";
import { Prisma, NotificationType } from "@prisma/client";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { canViewRequest } from "@/lib/requests/access";
import { parseRequestDetails } from "@/lib/requests/details";
import { getRequestStatusLabel } from "@/lib/requests/utils";
import { getChatNotificationCopy, listEligibleChatChannelsForUser } from "@/lib/notifications/chat-membership";

export type NotificationCategory = "message" | "task" | "announcement" | "event" | "request";

export type NotificationItem = {
  id: string;
  type: NotificationCategory;
  title: string;
  description: string;
  href: string;
  timestamp: string;
  readAt?: string | null;
};

export type NotificationsResult = {
  items: NotificationItem[];
  count: number;
};

const notificationTypeMap: Record<NotificationType, NotificationCategory> = {
  MESSAGE: "message",
  TASK: "task",
  ANNOUNCEMENT: "announcement",
  EVENT: "event",
  REQUEST: "request",
  MENTION: "message"
};

function toNotificationCategory(type: NotificationType): NotificationCategory {
  return notificationTypeMap[type];
}

async function getStoredNotificationItems(
  userId: string,
  parishId: string
): Promise<NotificationsResult> {
  const eligibleChannels = await listEligibleChatChannelsForUser({ userId, parishId });
  const allowedByChannel = new Map(eligibleChannels.map((channel) => [channel.channelId, channel]));

  const notifications = await prisma.notification.findMany({
    where: { userId, parishId },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const filtered = notifications.filter((notification) => {
    if (notification.type !== "MESSAGE" && notification.type !== "MENTION") return true;

    const channelId = notification.chatChannelId ?? (() => {
      const match = notification.href.match(/[?&]channel=([^&]+)/);
      return match?.[1] ?? null;
    })();

    if (!channelId) return false;

    const channel = allowedByChannel.get(channelId);
    if (!channel) return false;

    return channel.joinedAt <= notification.createdAt;
  });

  return {
    items: filtered.slice(0, 50).map((notification) => ({
      id: notification.id,
      type: toNotificationCategory(notification.type),
      title: notification.title,
      description: notification.description ?? "",
      href: notification.href,
      timestamp: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null
    })),
    count: filtered.filter((notification) => notification.readAt == null).length
  };
}

/**
 * Aggregate all notification items for a user within a parish.
 * Items are sourced from existing domain data:
 *  - Unread chat messages (grouped by channel)
 *  - New tasks assigned (since lastSeenTasksAt)
 *  - New announcements (since lastSeenAnnouncementsAt)
 *  - New events (since lastSeenEventsAt)
 *  - Pending approval requests (tasks, groups, events) — leaders only
 */

export async function getNotificationUnreadCount(
  userId: string,
  parishId: string
): Promise<number> {
  // Check whether the stored-notification system is active for this user.
  const storedCount = await prisma.notification.count({
    where: { userId, parishId }
  });

  if (storedCount > 0) {
    // The stored path is active: apply the same membership-gated filter used by
    // getStoredNotificationItems so the badge count is consistent with the bell
    // feed.  A raw `count({ readAt: null })` would include chat notifications
    // for channels the user is no longer eligible for, causing the badge to
    // diverge from the visible item list (privacy leak).
    const stored = await getStoredNotificationItems(userId, parishId);
    return stored.count;
  }

  const result = await getNotificationItems(userId, parishId);
  return result.count;
}

export async function getNotificationItems(
  userId: string,
  parishId: string
): Promise<NotificationsResult> {
  // If ANY stored notifications exist for this user, use only the stored path.
  // Do not fall back to the legacy derived path when stored.items is empty due
  // to membership filtering — that would mix stored + legacy sources and make
  // the badge count inconsistent with the bell feed.
  const storedCount = await prisma.notification.count({
    where: { userId, parishId }
  });

  if (storedCount > 0) {
    return getStoredNotificationItems(userId, parishId);
  }

  const [messages, tasks, announcements, events, pendingRequests, requestUpdates] = await Promise.all([
    getUnreadMessageItems(userId, parishId),
    getNewTaskItems(userId, parishId),
    getNewAnnouncementItems(userId, parishId),
    getNewEventItems(userId, parishId),
    getPendingRequestItems(userId, parishId),
    getRequestNotificationItems(userId, parishId)
  ]);

  const items = [
    ...messages,
    ...tasks,
    ...announcements,
    ...events,
    ...pendingRequests,
    ...requestUpdates
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return { items, count: items.length };
}

async function getUnreadMessageItems(
  userId: string,
  parishId: string
): Promise<NotificationItem[]> {
  const eligibleChannels = await listEligibleChatChannelsForUser({ userId, parishId });

  if (eligibleChannels.length === 0) return [];

  const rows = await prisma.$queryRaw<
    Array<{ channelId: string; cnt: number; latestAt: Date }>
  >(
    Prisma.sql`
      SELECT
        m."channelId",
        COUNT(*)::int AS cnt,
        MAX(m."createdAt") AS "latestAt"
      FROM "ChatMessage" m
      LEFT JOIN "ChatRoomReadState" r
        ON r."roomId" = m."channelId" AND r."userId" = ${userId}
      WHERE ${Prisma.join(
        eligibleChannels.map(
          (channel) => Prisma.sql`(m."channelId" = ${channel.channelId} AND m."createdAt" >= ${channel.joinedAt})`
        ),
        " OR "
      )}
        AND m."authorId" != ${userId}
        AND m."deletedAt" IS NULL
        AND m."createdAt" > COALESCE(r."lastReadAt", '1970-01-01')
      GROUP BY m."channelId"
      HAVING COUNT(*) > 0
    `
  );

  const channelMap = new Map(eligibleChannels.map((channel) => [channel.channelId, channel]));

  return rows.map((row) => {
    const channel = channelMap.get(row.channelId);
    const copy = getChatNotificationCopy({
      channelName: channel?.channelName ?? "Chat",
      channelType: channel?.channelType ?? "PARISH",
      groupVisibility: channel?.groupVisibility ?? null
    });

    return {
      id: `msg-${row.channelId}`,
      type: "message" as const,
      title: row.cnt === 1 ? copy.title : `${row.cnt} new messages`,
      description: copy.description,
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
    select: { lastSeenTasksAt: true, createdAt: true }
  });

  const since = user?.lastSeenTasksAt ?? user?.createdAt ?? new Date();

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
    select: { lastSeenAnnouncementsAt: true, createdAt: true }
  });

  const since = user?.lastSeenAnnouncementsAt ?? user?.createdAt ?? new Date();

  const announcements = await prisma.announcement.findMany({
    where: {
      ...buildAnnouncementVisibilityWhere({ parishId, userId, status: "published" }),
      publishedAt: { not: null, gt: since },
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
    select: { lastSeenEventsAt: true, createdAt: true }
  });

  const since = user?.lastSeenEventsAt ?? user?.createdAt ?? new Date();

  const events = await prisma.event.findMany({
    where: {
      parishId,
      deletedAt: null,
      createdAt: { gt: since },
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

async function getPendingRequestItems(
  userId: string,
  parishId: string
): Promise<NotificationItem[]> {
  const membership = await getParishMembership(parishId, userId);
  if (!membership || !isParishLeader(membership.role)) {
    return [];
  }

  const [pendingTasks, pendingGroups, pendingEvents, pendingAccess] = await Promise.all([
    prisma.task.findMany({
      where: {
        parishId,
        approvalStatus: "PENDING",
        archivedAt: null
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.group.findMany({
      where: {
        parishId,
        status: "PENDING_APPROVAL"
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.eventRequest.findMany({
      where: {
        parishId,
        status: "PENDING"
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        requester: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.accessRequest.findMany({
      where: {
        parishId,
        status: "PENDING"
      },
      select: {
        id: true,
        createdAt: true,
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  const items: NotificationItem[] = [];

  for (const task of pendingTasks) {
    items.push({
      id: `req-task-${task.id}`,
      type: "request",
      title: `Task approval: ${task.title}`,
      description: `Requested by ${task.createdBy?.name ?? "a parishioner"}`,
      href: "/tasks",
      timestamp: task.createdAt.toISOString()
    });
  }

  for (const group of pendingGroups) {
    items.push({
      id: `req-group-${group.id}`,
      type: "request",
      title: `Group request: ${group.name}`,
      description: `Requested by ${group.createdBy?.name ?? group.createdBy?.email ?? "a parishioner"}`,
      href: "/groups",
      timestamp: group.createdAt.toISOString()
    });
  }

  for (const evt of pendingEvents) {
    items.push({
      id: `req-event-${evt.id}`,
      type: "request",
      title: `Event request: ${evt.title}`,
      description: `Requested by ${evt.requester?.name ?? "a parishioner"}`,
      href: "/calendar",
      timestamp: evt.createdAt.toISOString()
    });
  }

  for (const req of pendingAccess) {
    items.push({
      id: `req-access-${req.id}`,
      type: "request",
      title: "Parish access request",
      description: req.user?.name ?? req.user?.email ?? "New parishioner",
      href: "/tasks",
      timestamp: req.createdAt.toISOString()
    });
  }

  return items;
}

async function getRequestNotificationItems(
  userId: string,
  parishId: string
): Promise<NotificationItem[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenRequestsAt: true, createdAt: true }
  });

  const since = user?.lastSeenRequestsAt ?? user?.createdAt ?? new Date();
  const membership = await getParishMembership(parishId, userId);
  const items: NotificationItem[] = [];

  const requesterUpdates = await prisma.request.findMany({
    where: {
      parishId,
      createdByUserId: userId,
      updatedAt: { gt: since },
      archivedAt: null
    },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      details: true
    },
    orderBy: { updatedAt: "desc" },
    take: 20
  });

  for (const request of requesterUpdates) {
    const details = parseRequestDetails(request.details);
    const scheduleWindow = details?.schedule?.startsAt
      ? new Date(details.schedule.startsAt).toLocaleString()
      : null;
    items.push({
      id: `req-update-${request.id}`,
      type: "request",
      title: `Request ${getRequestStatusLabel(request.status).toLowerCase()}: ${request.title}`,
      description: scheduleWindow ? `Proposed time: ${scheduleWindow}` : "Check the latest update.",
      href: `/requests/${request.id}`,
      timestamp: request.updatedAt.toISOString()
    });
  }

  if (membership && isParishLeader(membership.role)) {
    const [newRequests, canceledRequests] = await Promise.all([
      prisma.request.findMany({
        where: {
          parishId,
          createdAt: { gt: since },
          archivedAt: null
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          createdByUserId: true,
          assignedToUserId: true,
          visibilityScope: true,
          createdBy: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.request.findMany({
        where: {
          parishId,
          status: "CANCELED",
          updatedAt: { gt: since },
          archivedAt: null
        },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdByUserId: true,
          assignedToUserId: true,
          visibilityScope: true,
          createdBy: { select: { name: true, email: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 20
      })
    ]);

    for (const request of newRequests) {
      const canView = canViewRequest({
        viewerId: userId,
        viewerRole: membership.role,
        createdByUserId: request.createdByUserId,
        assignedToUserId: request.assignedToUserId,
        visibilityScope: request.visibilityScope
      });
      if (!canView) continue;
      items.push({
        id: `req-new-${request.id}`,
        type: "request",
        title: `New request: ${request.title}`,
        description: `Submitted by ${request.createdBy?.name ?? request.createdBy?.email ?? "a parishioner"}`,
        href: `/admin/requests?requestId=${request.id}`,
        timestamp: request.createdAt.toISOString()
      });
    }

    for (const request of canceledRequests) {
      const canView = canViewRequest({
        viewerId: userId,
        viewerRole: membership.role,
        createdByUserId: request.createdByUserId,
        assignedToUserId: request.assignedToUserId,
        visibilityScope: request.visibilityScope
      });
      if (!canView) continue;
      items.push({
        id: `req-canceled-${request.id}`,
        type: "request",
        title: `Request canceled: ${request.title}`,
        description: `Canceled by ${request.createdBy?.name ?? request.createdBy?.email ?? "a parishioner"}`,
        href: `/admin/requests?requestId=${request.id}`,
        timestamp: request.updatedAt.toISOString()
      });
    }
  }

  return items;
}
