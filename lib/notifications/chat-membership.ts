import { prisma } from "@/server/db/prisma";

type EligibleChannel = {
  channelId: string;
  channelName: string;
  channelType: "ANNOUNCEMENT" | "GROUP" | "PARISH";
  groupVisibility: "PUBLIC" | "PRIVATE" | null;
  joinedAt: Date;
};

export async function listEligibleChatChannelsForUser(opts: {
  userId: string;
  parishId: string;
}): Promise<EligibleChannel[]> {
  const { userId, parishId } = opts;

  const [parishMembership, user, channels, channelMemberships, groupMemberships, explicitChannelCounts] =
    await Promise.all([
      prisma.membership.findUnique({
        where: { parishId_userId: { parishId, userId } },
        select: { id: true }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true }
      }),
      prisma.chatChannel.findMany({
        where: { parishId },
        select: {
          id: true,
          name: true,
          type: true,
          groupId: true,
          group: { select: { visibility: true } }
        }
      }),
      prisma.chatChannelMembership.findMany({
        where: { userId },
        select: { channelId: true, createdAt: true }
      }),
      prisma.groupMembership.findMany({
        where: {
          userId,
          status: "ACTIVE",
          group: { parishId }
        },
        select: { groupId: true, createdAt: true }
      }),
      prisma.chatChannelMembership.groupBy({
        by: ["channelId"],
        _count: { _all: true }
      })
    ]);

  if (!parishMembership) return [];

  const parishJoinedAt = user?.createdAt ?? new Date();
  const channelMembershipByChannel = new Map(channelMemberships.map((m) => [m.channelId, m.createdAt]));
  const groupMembershipByGroup = new Map(groupMemberships.map((m) => [m.groupId, m.createdAt]));
  const explicitMembershipChannelIds = new Set(explicitChannelCounts.map((c) => c.channelId));

  const eligible: EligibleChannel[] = [];

  for (const channel of channels) {
    if (channel.type === "GROUP") {
      if (!channel.groupId) continue;
      const joinedAt = groupMembershipByGroup.get(channel.groupId);
      if (!joinedAt) continue;
      eligible.push({
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        groupVisibility: channel.group?.visibility ?? null,
        joinedAt
      });
      continue;
    }

    const explicitJoinedAt = channelMembershipByChannel.get(channel.id);
    if (explicitJoinedAt) {
      eligible.push({
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        groupVisibility: null,
        joinedAt: explicitJoinedAt
      });
      continue;
    }

    if (!explicitMembershipChannelIds.has(channel.id)) {
      eligible.push({
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        groupVisibility: null,
        joinedAt: parishJoinedAt
      });
    }
  }

  return eligible;
}

export function getChatNotificationCopy(opts: {
  channelName: string;
  channelType: "ANNOUNCEMENT" | "GROUP" | "PARISH";
  groupVisibility: "PUBLIC" | "PRIVATE" | null;
}) {
  const hideChannelName = opts.channelType === "GROUP" && opts.groupVisibility === "PRIVATE";

  if (hideChannelName) {
    return {
      title: "New message",
      description: "You have a new message"
    };
  }

  return {
    title: "New message",
    description: `You have a new message in ${opts.channelName}`
  };
}
