import { getServerSession } from "next-auth";
import { unstable_noStore as noStore } from "next/cache";
import type { ParishRole } from "@prisma/client";
import { authOptions } from "@/server/auth/options";
import { ensureParishBootstrap } from "@/server/auth/bootstrap";
import { prisma } from "@/server/db/prisma";
import { isCoordinatorInParish } from "@/server/db/groups";
import { getWeekForSelection, type WeekSelection } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { getGratitudeSpotlight } from "@/lib/queries/gratitude";
import { listUnreadCountsForRooms } from "@/lib/queries/chat";
import { listEventsByRange } from "@/lib/queries/events";
import { buildAvatarImagePath } from "@/lib/storage/avatar";

export type TaskPreview = {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  dueBy: Date | null;
  owner: {
    name: string;
    avatarUrl?: string | null;
    initials: string;
  };
};

export type EventPreview = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
};

export type AnnouncementPreview = {
  id: string;
  title: string;
  updatedAt: Date;
  createdAt: Date;
  publishedAt: Date | null;
};

export type ThisWeekData = {
  parishId: string;
  week: {
    id: string;
    label: string;
    startsOn: Date;
    endsOn: Date;
  };
  tasks: TaskPreview[];
  events: EventPreview[];
  nextUpcomingEvent?: EventPreview | null;
  announcements: AnnouncementPreview[];
  parishRole: ParishRole | null;
  memberGroups: Array<{
    id: string;
    name: string;
    visibility: "PUBLIC" | "PRIVATE";
    description: string | null;
    unreadCount?: number | null;
    lastMessage?: string | null;
    lastMessageTime?: Date | null;
    lastMessageAuthor?: string | null;
  }>;
  hasPublicGroups: boolean;
  stats: {
    tasksDone: number;
    tasksTotal: number;
    completionPct: number;
  };
  pendingTaskApprovals: number;
  pendingAccessRequests: number;
  pendingEventRequests: number;
  canManageSpotlight: boolean;
  gratitudeSpotlight: {
    enabled: boolean;
    limit: number;
    items: Array<{
      id: string;
      nomineeName: string;
      reason: string;
    }>;
  };
};

export type ThisWeekMemberGroupPreview = ThisWeekData["memberGroups"][number];

export function sortThisWeekMemberGroups(groups: ThisWeekMemberGroupPreview[]) {
  return [...groups].sort((a, b) => {
    const aHasUnread = (a.unreadCount ?? 0) > 0;
    const bHasUnread = (b.unreadCount ?? 0) > 0;

    if (aHasUnread !== bHasUnread) {
      return aHasUnread ? -1 : 1;
    }

    const aLastMessageTime = a.lastMessageTime?.getTime() ?? 0;
    const bLastMessageTime = b.lastMessageTime?.getTime() ?? 0;

    if (aLastMessageTime !== bLastMessageTime) {
      return bLastMessageTime - aLastMessageTime;
    }

    return a.name.localeCompare(b.name);
  });
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export async function getThisWeekDataForUser({
  parishId,
  userId,
  weekSelection = "current",
  now = getNow()
}: {
  parishId: string;
  userId: string;
  weekSelection?: WeekSelection;
  now?: Date;
}): Promise<ThisWeekData> {
  const week = await getWeekForSelection(parishId, weekSelection, now);

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId
      }
    },
    select: { role: true }
  });

  const [
    tasks,
    events,
    nextUpcomingEvent,
    announcements,
    memberGroups,
    publicGroupCount,
    pendingApprovals,
    pendingAccessRequests,
    pendingEventRequests,
    gratitudeSpotlight,
    coordinatorStatus
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        parishId,
        weekId: week.id,
        archivedAt: null,
        visibility: "PUBLIC",
        approvalStatus: "APPROVED"
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        dueAt: true,
        owner: {
          select: {
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.event.findMany({
      where: { parishId, weekId: week.id, deletedAt: null },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        location: true
      }
    }),
    listEventsByRange({
      parishId,
      start: now,
      end: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      userId
    }).then((calendarEvents) => {
      const nextEvent = calendarEvents[0];
      if (!nextEvent) {
        return null;
      }
      return {
        id: nextEvent.id,
        title: nextEvent.title,
        startsAt: nextEvent.startsAt,
        endsAt: nextEvent.endsAt,
        location: nextEvent.location
      };
    }),
    prisma.announcement.findMany({
      where: {
        parishId,
        archivedAt: null
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        publishedAt: true
      }
    }),
    prisma.groupMembership.findMany({
      where: {
        userId,
        status: "ACTIVE",
        group: {
          parishId,
          archivedAt: null
        }
      },
      orderBy: {
        group: {
          name: "asc"
        }
      },
      select: {
        group: {
          select: {
            id: true,
            name: true,
            visibility: true,
            description: true,
            avatarKey: true,
            chatChannels: {
              where: { type: "GROUP" },
              select: {
                id: true,
                messages: {
                  where: { deletedAt: null },
                  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                  take: 1,
                  select: {
                    body: true,
                    createdAt: true,
                    author: {
                      select: {
                        name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }),
    prisma.group.count({
      where: {
        parishId,
        visibility: "PUBLIC",
        archivedAt: null
      }
    }),
    prisma.task.count({
      where: {
        parishId,
        weekId: week.id,
        archivedAt: null,
        visibility: "PUBLIC",
        approvalStatus: "PENDING"
      }
    }),
    membership?.role && ["ADMIN", "SHEPHERD"].includes(membership.role)
      ? prisma.accessRequest.count({
          where: {
            parishId,
            status: "PENDING"
          }
        })
      : Promise.resolve(0),
    membership?.role && ["ADMIN", "SHEPHERD"].includes(membership.role)
      ? prisma.eventRequest.count({
          where: {
            parishId,
            status: "PENDING"
          }
        })
      : Promise.resolve(0),
    getGratitudeSpotlight({ parishId, weekId: week.id }),
    isCoordinatorInParish(parishId, userId)
  ]);

  const dueByDefault = new Date(week.endsOn.getTime() - 1);
  const taskPreviews: TaskPreview[] = tasks.map((task) => {
    const ownerName = task.owner?.name ?? task.owner?.email?.split("@")[0] ?? "Unassigned";
    const dueBy = task.dueAt ?? new Date(task.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    return {
      id: task.id,
      title: task.title,
      status: task.status === "ARCHIVED" ? "DONE" : task.status,
      dueBy: dueBy ?? dueByDefault,
      owner: {
        name: ownerName,
        initials: getInitials(ownerName)
      }
    };
  });

  const tasksDone = taskPreviews.filter((task) => task.status === "DONE").length;
  const tasksTotal = taskPreviews.length;
  const completionPct = tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100);

  // Fetch unread counts for member groups
  const groupChannels = await prisma.chatChannel.findMany({
    where: {
      group: {
        id: {
          in: memberGroups.map((m) => m.group.id)
        }
      }
    },
    select: {
      id: true,
      groupId: true
    }
  });

  const unreadCounts = await listUnreadCountsForRooms(
    groupChannels.map((ch) => ch.id),
    userId
  );

  // Create a map of groupId to unreadCount
  const unreadCountByGroupId = new Map<string, number>();
  groupChannels.forEach((channel) => {
    if (channel.groupId) {
      const count = unreadCounts.get(channel.id) ?? 0;
      unreadCountByGroupId.set(channel.groupId, count);
    }
  });

  const memberGroupPreviews = sortThisWeekMemberGroups(
    memberGroups.map((m) => {
      const lastMsg = m.group.chatChannels?.[0]?.messages?.[0];
      return {
        id: m.group.id,
        name: m.group.name,
        visibility: m.group.visibility,
        description: m.group.description,
        avatarUrl: m.group.avatarKey ? buildAvatarImagePath(m.group.avatarKey) : null,
        unreadCount: unreadCountByGroupId.get(m.group.id) ?? 0,
        lastMessage: lastMsg?.body ?? null,
        lastMessageTime: lastMsg?.createdAt ?? null,
        lastMessageAuthor: lastMsg?.author?.name ?? lastMsg?.author?.email ?? null
      };
    })
  );

  return {
    parishId,
    week: {
      id: week.id,
      label: week.label,
      startsOn: week.startsOn,
      endsOn: week.endsOn
    },
    tasks: taskPreviews,
    events,
    nextUpcomingEvent,
    announcements: announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      updatedAt: announcement.updatedAt,
      createdAt: announcement.createdAt,
      publishedAt: announcement.publishedAt
    })),
    parishRole: membership?.role ?? null,
    memberGroups: memberGroupPreviews,
    hasPublicGroups: publicGroupCount > 0,
    stats: {
      tasksDone,
      tasksTotal,
      completionPct
    },
    pendingTaskApprovals:
      membership?.role && ["ADMIN", "SHEPHERD"].includes(membership.role)
        ? pendingApprovals
        : 0,
    pendingAccessRequests,
    pendingEventRequests,
    canManageSpotlight:
      Boolean(membership?.role && ["ADMIN", "SHEPHERD"].includes(membership.role)) ||
      coordinatorStatus,
    gratitudeSpotlight
  };
}

export async function getThisWeekData({
  weekSelection = "current",
  now = getNow()
}: {
  weekSelection?: WeekSelection;
  now?: Date;
} = {}): Promise<ThisWeekData> {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const actorUserId = session.user.id;
  const activeParishId = session.user.activeParishId;
  const parishId = activeParishId
    ? await prisma.parish
        .findUnique({
          where: { id: activeParishId },
          select: { id: true }
        })
        .then((parish) => parish?.id ?? ensureParishBootstrap(session.user.id))
    : await ensureParishBootstrap(session.user.id);

  if (!parishId) {
    throw new Error("No active parish membership");
  }

  return getThisWeekDataForUser({
    parishId,
    userId: actorUserId,
    weekSelection,
    now
  });
}
