"use server";

import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import {
  getGroupMembership,
  getParishMembership,
  isCoordinatorForGroup,
  isCoordinatorInParish
} from "@/server/db/groups";
import {
  canModerateChatChannel,
  canPostAnnouncementChannel,
  canPostGroupChannel,
  isParishLeader
} from "@/lib/permissions";
import { getNow as defaultGetNow } from "@/lib/time/getNow";
import { REACTION_EMOJIS } from "@/lib/chat/reactions";

const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;
const REACTION_SET = new Set(REACTION_EMOJIS);

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

async function buildReactionSummary(messageId: string, userId: string) {
  const [counts, reacted] = await Promise.all([
    prisma.chatReaction.groupBy({
      by: ["emoji"],
      where: {
        messageId
      },
      _count: {
        _all: true
      }
    }),
    prisma.chatReaction.findMany({
      where: {
        messageId,
        userId
      },
      select: {
        emoji: true
      }
    })
  ]);

  const reactedSet = new Set(reacted.map((entry) => entry.emoji));
  const countMap = new Map(counts.map((entry) => [entry.emoji, entry._count._all]));

  return REACTION_EMOJIS.flatMap((emoji) => {
    const count = countMap.get(emoji);
    if (!count) return [];
    return [
      {
        emoji,
        count,
        reactedByMe: reactedSet.has(emoji)
      }
    ];
  });
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

export async function postMessage(
  channelId: string,
  body: string,
  parentMessageIdOrGetNow?: string | (() => Date),
  getNow?: () => Date
) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parentMessageId =
    typeof parentMessageIdOrGetNow === "string" ? parentMessageIdOrGetNow : undefined;
  const resolveNow =
    typeof parentMessageIdOrGetNow === "function" ? parentMessageIdOrGetNow : getNow;

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

  let parentMessage: { id: string; channelId: string } | null = null;
  if (parentMessageId) {
    parentMessage = await prisma.chatMessage.findFirst({
      where: {
        id: parentMessageId,
        channelId: channel.id
      },
      select: {
        id: true,
        channelId: true
      }
    });
  }

  const now = (resolveNow ?? defaultGetNow)();

  const message = await prisma.chatMessage.create({
    data: {
      channelId: channel.id,
      authorId: userId,
      parentMessageId: parentMessage?.id ?? null,
      body: trimmed,
      createdAt: now
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      editedAt: true,
      deletedAt: true,
      _count: {
        select: {
          replies: true
        }
      },
      parentMessage: {
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
      },
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
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
    replyCount: message._count.replies ?? 0,
    reactions: [],
    author: {
      id: message.author.id,
      name: message.author.name ?? message.author.email ?? "Parish member"
    },
    parentMessage: message.parentMessage
      ? {
          id: message.parentMessage.id,
          body: message.parentMessage.body,
          createdAt: message.parentMessage.createdAt,
          deletedAt: message.parentMessage.deletedAt,
          author: {
            id: message.parentMessage.author.id,
            name:
              message.parentMessage.author.name ??
              message.parentMessage.author.email ??
              "Parish member"
          }
        }
      : null
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
      channelId: true,
      authorId: true,
      createdAt: true,
      deletedAt: true
    }
  });

  if (!message) {
    throw new Error("Not found");
  }

  const { channel, parishMembership } = await requireChannelAccess(
    userId,
    parishId,
    message.channelId
  );

  const isCoordinator = channel.groupId
    ? await isCoordinatorForGroup(channel.groupId, userId)
    : await isCoordinatorInParish(parishId, userId);

  const canModerate = canModerateChatChannel(parishMembership.role, isCoordinator);

  const now = (getNow ?? defaultGetNow)();
  const isWithinWindow =
    message.authorId === userId &&
    now.getTime() - message.createdAt.getTime() <= MESSAGE_EDIT_WINDOW_MS;

  if (!canModerate && !isWithinWindow) {
    throw new Error("Forbidden");
  }

  if (message.deletedAt) {
    return;
  }

  await prisma.chatMessage.update({
    where: {
      id: messageId
    },
    data: {
      deletedAt: now
    }
  });
}

export async function editMessage(messageId: string, body: string, getNow?: () => Date) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const message = await prisma.chatMessage.findUnique({
    where: {
      id: messageId
    },
    select: {
      id: true,
      channelId: true,
      authorId: true,
      createdAt: true,
      deletedAt: true
    }
  });

  if (!message) {
    throw new Error("Not found");
  }

  if (message.deletedAt) {
    throw new Error("Cannot edit deleted message");
  }

  const { channel, parishMembership } = await requireChannelAccess(
    userId,
    parishId,
    message.channelId
  );

  const isCoordinator = channel.groupId
    ? await isCoordinatorForGroup(channel.groupId, userId)
    : await isCoordinatorInParish(parishId, userId);

  const canModerate = canModerateChatChannel(parishMembership.role, isCoordinator);

  const now = (getNow ?? defaultGetNow)();
  const isWithinWindow =
    message.authorId === userId &&
    now.getTime() - message.createdAt.getTime() <= MESSAGE_EDIT_WINDOW_MS;

  if (!canModerate && !isWithinWindow) {
    throw new Error("Forbidden");
  }

  const trimmed = assertMessageBody(body);

  const updated = await prisma.chatMessage.update({
    where: {
      id: messageId
    },
    data: {
      body: trimmed,
      editedAt: now
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      editedAt: true,
      deletedAt: true,
      _count: {
        select: {
          replies: true
        }
      },
      parentMessage: {
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
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  const reactions = await buildReactionSummary(updated.id, userId);

  return {
    id: updated.id,
    body: updated.body,
    createdAt: updated.createdAt,
    editedAt: updated.editedAt,
    deletedAt: updated.deletedAt,
    replyCount: updated._count.replies ?? 0,
    reactions,
    author: {
      id: updated.author.id,
      name: updated.author.name ?? updated.author.email ?? "Parish member"
    },
    parentMessage: updated.parentMessage
      ? {
          id: updated.parentMessage.id,
          body: updated.parentMessage.body,
          createdAt: updated.parentMessage.createdAt,
          deletedAt: updated.parentMessage.deletedAt,
          author: {
            id: updated.parentMessage.author.id,
            name:
              updated.parentMessage.author.name ??
              updated.parentMessage.author.email ??
              "Parish member"
          }
        }
      : null
  };
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

export async function toggleReaction(messageId: string, emoji: string) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  if (!REACTION_SET.has(emoji as (typeof REACTION_EMOJIS)[number])) {
    throw new Error("Invalid reaction");
  }

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

  await requireChannelAccess(userId, parishId, message.channelId);

  const existing = await prisma.chatReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId,
        emoji
      }
    }
  });

  if (existing) {
    await prisma.chatReaction.delete({
      where: {
        id: existing.id
      }
    });
  } else {
    await prisma.chatReaction.create({
      data: {
        messageId,
        userId,
        emoji
      }
    });
  }

  const reactions = await buildReactionSummary(messageId, userId);

  return {
    messageId,
    reactions
  };
}

export async function markRoomRead(channelId: string, getNow?: () => Date) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await requireChannelAccess(userId, parishId, channelId);

  const now = (getNow ?? defaultGetNow)();

  const state = await prisma.chatRoomReadState.upsert({
    where: {
      roomId_userId: {
        roomId: channelId,
        userId
      }
    },
    update: {
      lastReadAt: now
    },
    create: {
      roomId: channelId,
      userId,
      lastReadAt: now
    }
  });

  return {
    roomId: state.roomId,
    lastReadAt: state.lastReadAt
  };
}
