import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

function nonGroupMembershipFilter(userId: string): Prisma.ChatChannelWhereInput {
  return {
    type: { in: ["PARISH", "ANNOUNCEMENT"] },
    OR: [{ memberships: { none: {} } }, { memberships: { some: { userId } } }]
  };
}

function groupMembershipFilter(userId: string): Prisma.ChatChannelWhereInput {
  return {
    type: "GROUP",
    group: {
      memberships: {
        some: {
          userId,
          status: "ACTIVE"
        }
      }
    }
  };
}

export function buildAnnouncementVisibilityWhere(input: {
  parishId: string;
  userId: string;
  status?: "draft" | "published";
  includeArchived?: boolean;
  includeAll?: boolean;
}): Prisma.AnnouncementWhereInput {
  const membershipGuard: Prisma.AnnouncementWhereInput = {
    parish: {
      memberships: {
        some: {
          userId: input.userId
        }
      }
    }
  };

  if (input.includeAll) {
    return {
      parishId: input.parishId,
      ...membershipGuard,
      ...(input.includeArchived ? {} : { archivedAt: null }),
      ...(input.status === "draft"
        ? { publishedAt: null }
        : input.status === "published"
          ? { publishedAt: { not: null } }
          : {})
    };
  }

  return {
    parishId: input.parishId,
    ...membershipGuard,
    ...(input.includeArchived ? {} : { archivedAt: null }),
    ...(input.status === "draft"
      ? { publishedAt: null }
      : input.status === "published"
        ? { publishedAt: { not: null } }
        : {}),
    OR: [
      { scopeType: "PARISH" },
      {
        scopeType: "CHAT",
        chatChannel: {
          OR: [groupMembershipFilter(input.userId), nonGroupMembershipFilter(input.userId)]
        }
      }
    ]
  };
}

export async function canAccessAnnouncement(input: {
  announcementId: string;
  parishId: string;
  userId: string;
  status?: "draft" | "published";
}): Promise<boolean> {
  const announcement = await prisma.announcement.findFirst({
    where: {
      id: input.announcementId,
      ...buildAnnouncementVisibilityWhere({
        parishId: input.parishId,
        userId: input.userId,
        status: input.status
      })
    },
    select: { id: true }
  });

  return Boolean(announcement);
}

export async function listChatAudienceMemberIds(channelId: string): Promise<string[]> {
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { type: true, groupId: true, parishId: true }
  });

  if (!channel) return [];

  if (channel.type === "GROUP" && channel.groupId) {
    const members = await prisma.groupMembership.findMany({
      where: { groupId: channel.groupId, status: "ACTIVE" },
      select: { userId: true }
    });

    const allowedMemberships = await prisma.membership.findMany({
      where: {
        parishId: channel.parishId,
        userId: { in: members.map((member) => member.userId) }
      },
      select: { userId: true }
    });

    return allowedMemberships.map((member) => member.userId);
  }

  const explicitMembers = await prisma.chatChannelMembership.findMany({
    where: {
      channelId,
      user: {
        memberships: {
          some: {
            parishId: channel.parishId
          }
        }
      }
    },
    select: { userId: true }
  });

  if (explicitMembers.length > 0) {
    return explicitMembers.map((member) => member.userId);
  }

  const members = await prisma.membership.findMany({
    where: { parishId: channel.parishId },
    select: { userId: true }
  });

  return members.map((member) => member.userId);
}
