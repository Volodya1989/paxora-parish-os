"use server";

import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getGroupMembership, getParishMembership, isCoordinatorForGroup, isCoordinatorInParish } from "@/server/db/groups";
import { canModerateChatChannel, canPostAnnouncementChannel, canPostGroupChannel, isParishLeader } from "@/lib/permissions";
import { getNow as defaultGetNow } from "@/lib/time/getNow";

function assertSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  return { userId: session.user.id, parishId: session.user.activeParishId };
}

async function requireParishMembership(userId: string, parishId: string) {
  const membership = await getParishMembership(parishId, userId);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  return membership;
}

async function getChannelOrThrow(parishId: string, channelId: string) {
  const channel = await prisma.chatChannel.findFirst({
    where: {
      id: channelId,
      parishId
    },
    select: {
      id: true,
      parishId: true,
      groupId: true,
      type: true,
      lockedAt: true
    }
  });

  if (!channel) {
    throw new Error("Not found");
  }

  return channel;
}

async function requireChannelAccess(userId: string, parishId: string, channelId: string) {
  const [parishMembership, channel] = await Promise.all([
    requireParishMembership(userId, parishId),
    getChannelOrThrow(parishId, channelId)
  ]);

  const isLeader = isParishLeader(parishMembership.role);

  if (channel.type === "GROUP") {
    if (!channel.groupId) {
      throw new Error("Not found");
    }

    if (isLeader) {
      return { channel, parishMembership, isLeader, groupMembership: null };
    }

    const groupMembership = await getGroupMembership(channel.groupId, userId);
    if (!groupMembership || groupMembership.status !== "ACTIVE") {
      throw new Error("Unauthorized");
    }

    return { channel, parishMembership, isLeader, groupMembership };
  }

  if (!isLeader) {
    const [membershipCount, membership] = await Promise.all([
      prisma.chatChannelMembership.count({
        where: {
          channelId: channel.id
        }
      }),
      prisma.chatChannelMembership.findUnique({
        where: {
          channelId_userId: {
            channelId: channel.id,
            userId
          }
        },
        select: {
          id: true
        }
      })
    ]);

    if (membershipCount > 0 && !membership) {
      throw new Error("Unauthorized");
    }
  }

  return { channel, parishMembership, isLeader, groupMembership: null };
}

function assertMessageBody(body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty");
  }
  if (trimmed.length > 1000) {
    throw new Error("Message is too long");
  }
  return trimmed;
}

async function requireModerationAccess(userId: string, parishId: string, channelId: string) {
  const { channel, parishMembership } = await requireChannelAccess(userId, parishId, channelId);

  const isCoordinator = channel.groupId
    ? await isCoordinatorForGroup(channel.groupId, userId)
    : await isCoordinatorInParish(parishId, userId);

  if (!canModerateChatChannel(parishMembership.role, isCoordinator)) {
    throw new Error("Forbidden");
  }

  return channel;
}

export async function postMessage(channelId: string, body: string, getNow?: () => Date) {
  
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const { channel, parishMembership, groupMembership } = await requireChannelAccess(
    userId,
    parishId,
    channelId
  );

  if (channel.lockedAt) {
    throw new Error("Channel is locked");
  }

  const trimmed = assertMessageBody(body);

  if (channel.type === "ANNOUNCEMENT") {
    const isCoordinator = await isCoordinatorInParish(parishId, userId);
    if (!canPostAnnouncementChannel(parishMembership.role, isCoordinator)) {
      throw new Error("Forbidden");
    }
  }

  if (channel.type === "GROUP") {
    const isMember = Boolean(groupMembership && groupMembership.status === "ACTIVE");
    if (!canPostGroupChannel(parishMembership.role, isMember)) {
      throw new Error("Forbidden");
    }
  }

  const now = (getNow ?? defaultGetNow)();

  const message = await prisma.chatMessage.create({
    data: {
      channelId: channel.id,
      authorId: userId,
      body: trimmed,
      createdAt: now
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      deletedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    deletedAt: message.deletedAt,
    author: {
      id: message.author.id,
      name: message.author.name ?? message.author.email ?? "Parish member"
    }
  };
}

export async function deleteMessage(messageId: string, getNow?: () => Date) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const message = await prisma.chatMessage.findUnique({
    where: {
      id: messageId
    },
    select: {
      id: true,
      channelId: true
    }
  });

  if (!message) {
    throw new Error("Not found");
  }

  await requireModerationAccess(userId, parishId, message.channelId);

  const now = (getNow ?? defaultGetNow)();

  await prisma.chatMessage.update({
    where: {
      id: messageId
    },
    data: {
      deletedAt: now
    }
  });
}

export async function pinMessage(messageId: string, getNow?: () => Date) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const message = await prisma.chatMessage.findUnique({
    where: {
      id: messageId
    },
    select: {
      id: true,
      channelId: true
    }
  });

  if (!message) {
    throw new Error("Not found");
  }

  await requireModerationAccess(userId, parishId, message.channelId);

  const now = (getNow ?? defaultGetNow)();

  await prisma.chatPinnedMessage.upsert({
    where: {
      channelId: message.channelId
    },
    update: {
      messageId: message.id,
      pinnedAt: now,
      pinnedById: userId
    },
    create: {
      channelId: message.channelId,
      messageId: message.id,
      pinnedAt: now,
      pinnedById: userId
    }
  });
}

export async function unpinMessage(channelId: string) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await requireModerationAccess(userId, parishId, channelId);

  await prisma.chatPinnedMessage.deleteMany({
    where: {
      channelId
    }
  });
}

export async function lockChannel(channelId: string, getNow?: () => Date) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await requireModerationAccess(userId, parishId, channelId);

  const now = (getNow ?? defaultGetNow)();

  await prisma.chatChannel.update({
    where: {
      id: channelId
    },
    data: {
      lockedAt: now
    }
  });
}

export async function unlockChannel(channelId: string) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await requireModerationAccess(userId, parishId, channelId);

  await prisma.chatChannel.update({
    where: {
      id: channelId
    },
    data: {
      lockedAt: null
    }
  });
}

export async function addMember(channelId: string, memberUserId: string) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const channel = await requireModerationAccess(userId, parishId, channelId);

  if (channel.groupId) {
    throw new Error("Cannot manage group channel members");
  }

  const member = await getParishMembership(parishId, memberUserId);
  if (!member) {
    throw new Error("User is not part of this parish");
  }

  await prisma.chatChannelMembership.upsert({
    where: {
      channelId_userId: {
        channelId: channel.id,
        userId: memberUserId
      }
    },
    update: {
      role: "MEMBER"
    },
    create: {
      channelId: channel.id,
      userId: memberUserId,
      role: "MEMBER"
    }
  });
}

export async function removeMember(channelId: string, memberUserId: string) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const channel = await requireModerationAccess(userId, parishId, channelId);

  if (channel.groupId) {
    throw new Error("Cannot manage group channel members");
  }

  await prisma.chatChannelMembership.deleteMany({
    where: {
      channelId: channel.id,
      userId: memberUserId
    }
  });
}
