import {
  Prisma,
  type ChatChannelMembershipRole,
  type ChatChannelType,
  type ParishRole
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { isParishLeader } from "@/lib/permissions";
import { getNow as defaultGetNow } from "@/lib/time/getNow";
import { REACTION_EMOJIS } from "@/lib/chat/reactions";

export type ChatChannelListItem = {
  id: string;
  name: string;
  description: string | null;
  type: ChatChannelType;
  lockedAt: Date | null;
  group: {
    id: string;
    name: string;
  } | null;
  unreadCount?: number | null;
  isMember: boolean;
};

export type ChatPollOptionItem = {
  id: string;
  label: string;
  votes: number;
  votedByMe: boolean;
};

export type ChatPollItem = {
  id: string;
  question: string;
  expiresAt: Date | null;
  totalVotes: number;
  options: ChatPollOptionItem[];
  myVoteOptionId: string | null;
};

export type ChatAttachmentItem = {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
};

export type ChatMessageItem = {
  id: string;
  body: string;
  createdAt: Date;
  editedAt?: Date | null;
  deletedAt: Date | null;
  replyCount: number;
  attachments: ChatAttachmentItem[];
  reactions: {
    emoji: string;
    count: number;
    reactedByMe: boolean;
  }[];
  author: {
    id: string;
    name: string;
  };
  parentMessage: {
    id: string;
    body: string;
    createdAt: Date;
    deletedAt: Date | null;
    author: {
      id: string;
      name: string;
    };
  } | null;
  poll?: ChatPollItem | null;
};

export type ChatPinnedMessageItem = {
  id: string;
  messageId: string;
  pinnedAt: Date;
  pinnedBy: {
    id: string;
    name: string;
  };
  message: ChatMessageItem;
};

export type ChatChannelMember = {
  userId: string;
  name: string;
  email: string;
  parishRole: ParishRole;
  channelRole: ChatChannelMembershipRole | null;
  isMember: boolean;
};

type ListMessagesInput = {
  channelId: string;
  cursor?: {
    createdAt: Date;
    id: string;
  };
  limit?: number;
  userId?: string;
  getNow?: () => Date;
};

type ReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

function buildReactionSummary(
  messageIds: string[],
  counts: Array<{ messageId: string; emoji: string; count: number }>,
  reacted: Array<{ messageId: string; emoji: string }>
) {
  const countMap = new Map<string, Map<string, number>>();
  const reactedMap = new Map<string, Set<string>>();

  counts.forEach((entry) => {
    const map = countMap.get(entry.messageId) ?? new Map<string, number>();
    map.set(entry.emoji, entry.count);
    countMap.set(entry.messageId, map);
  });

  reacted.forEach((entry) => {
    const set = reactedMap.get(entry.messageId) ?? new Set<string>();
    set.add(entry.emoji);
    reactedMap.set(entry.messageId, set);
  });

  const summaryMap = new Map<string, ReactionSummary[]>();

  messageIds.forEach((messageId) => {
    const messageCounts = countMap.get(messageId);
    if (!messageCounts) {
      summaryMap.set(messageId, []);
      return;
    }

    const reactedSet = reactedMap.get(messageId) ?? new Set<string>();
    const summary = REACTION_EMOJIS.flatMap((emoji) => {
      const count = messageCounts.get(emoji);
      if (!count) return [];
      return [
        {
          emoji,
          count,
          reactedByMe: reactedSet.has(emoji)
        }
      ];
    });

    summaryMap.set(messageId, summary);
  });

  return summaryMap;
}

async function listReactionsForMessages(messageIds: string[], userId?: string) {
  if (messageIds.length === 0) {
    return new Map<string, ReactionSummary[]>();
  }

  const [counts, reacted] = await Promise.all([
    prisma.chatReaction.groupBy({
      by: ["messageId", "emoji"],
      where: {
        messageId: {
          in: messageIds
        }
      },
      _count: {
        _all: true
      }
    }),
    userId
      ? prisma.chatReaction.findMany({
          where: {
            userId,
            messageId: {
              in: messageIds
            }
          },
          select: {
            messageId: true,
            emoji: true
          }
        })
      : Promise.resolve([])
  ]);

  const normalizedCounts = counts.map((entry) => ({
    messageId: entry.messageId,
    emoji: entry.emoji,
    count: entry._count._all
  }));

  return buildReactionSummary(messageIds, normalizedCounts, reacted);
}

export async function getLastReadAt(channelId: string, userId: string): Promise<Date | null> {
  const state = await prisma.chatRoomReadState.findUnique({
    where: { roomId_userId: { roomId: channelId, userId } },
    select: { lastReadAt: true }
  });
  return state?.lastReadAt ?? null;
}

export async function listUnreadCountsForRooms(roomIds: string[], userId: string) {
  if (roomIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await prisma.$queryRaw<
    Array<{
      roomId: string;
      count: number;
    }>
  >(
    Prisma.sql`
      SELECT m."channelId" as "roomId", COUNT(*)::int as "count"
      FROM "ChatMessage" m
      LEFT JOIN "ChatRoomReadState" r
        ON r."roomId" = m."channelId" AND r."userId" = ${userId}
      WHERE m."channelId" IN (${Prisma.join(roomIds)})
        AND m."authorId" != ${userId}
        AND m."createdAt" > COALESCE(r."lastReadAt", '1970-01-01')
      GROUP BY m."channelId"
    `
  );

  const map = new Map<string, number>();
  rows.forEach((row) => {
    map.set(row.roomId, Number(row.count));
  });

  return map;
}

export async function listChannelsForUser(parishId: string, userId: string) {
  const parishMembership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId
      }
    },
    select: { role: true }
  });

  if (!parishMembership) {
    throw new Error("Unauthorized");
  }

  const isLeader = isParishLeader(parishMembership.role);

  const groupMemberships = await prisma.groupMembership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      group: {
        parishId
      }
    },
    select: {
      groupId: true
    }
  });

  const groupIds = groupMemberships.map((membership) => membership.groupId);

  const channels = await prisma.chatChannel.findMany({
    where: {
      parishId,
      OR: [
        {
          type: {
            in: ["PARISH", "ANNOUNCEMENT"]
          }
        },
        isLeader
          ? {
              type: "GROUP"
            }
          : {
              type: "GROUP",
              groupId: {
                in: groupIds.length ? groupIds : ["__none__"]
              }
            }
      ]
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      lockedAt: true,
      group: {
        select: {
          id: true,
          name: true
        }
      },
      memberships: {
        where: {
          userId
        },
        select: {
          id: true
        }
      },
      _count: {
        select: {
          memberships: true
        }
      }
    }
  });

  const visibleChannels = channels
    .filter((channel) => {
      if (channel.type === "GROUP") {
        return true;
      }

      if (isLeader) {
        return true;
      }

      if (channel._count.memberships === 0) {
        return true;
      }

      return channel.memberships.length > 0;
    })
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description ?? null,
      type: channel.type,
      lockedAt: channel.lockedAt,
      group: channel.group ? { id: channel.group.id, name: channel.group.name } : null,
      isMember:
        channel.type === "GROUP"
          ? true
          : channel._count.memberships === 0
            ? true
            : channel.memberships.length > 0 || isLeader
    }));

  const unreadCounts = await listUnreadCountsForRooms(
    visibleChannels.map((channel) => channel.id),
    userId
  );

  return visibleChannels.map((channel) => ({
    ...channel,
    unreadCount: unreadCounts.get(channel.id) ?? 0
  })) as ChatChannelListItem[];
}

export async function getChannelById(parishId: string, channelId: string) {
  return prisma.chatChannel.findFirst({
    where: {
      id: channelId,
      parishId
    },
    select: {
      id: true,
      parishId: true,
      groupId: true,
      type: true,
      name: true,
      description: true,
      lockedAt: true,
      createdAt: true,
      group: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
}

export async function listMessages({
  channelId,
  cursor,
  limit = 50,
  userId,
  getNow
}: ListMessagesInput) {
  const resolveNow = getNow ?? defaultGetNow;
  void resolveNow;

  const where = cursor
    ? {
        channelId,
        OR: [
          {
            createdAt: {
              gt: cursor.createdAt
            }
          },
          {
            createdAt: cursor.createdAt,
            id: {
              gt: cursor.id
            }
          }
        ]
      }
    : {
        channelId
      };

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit,
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
      attachments: {
        select: {
          id: true,
          url: true,
          mimeType: true,
          size: true,
          width: true,
          height: true
        }
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      poll: {
        select: {
          id: true,
          question: true,
          expiresAt: true,
          options: {
            orderBy: { order: "asc" as const },
            select: {
              id: true,
              label: true,
              _count: { select: { votes: true } },
              votes: userId
                ? {
                    where: { userId },
                    select: { id: true }
                  }
                : false
            }
          }
        }
      }
    }
  });

  const messageIds = messages.map((message) => message.id);
  const reactionMap = await listReactionsForMessages(messageIds, userId);

  return messages.map((message) => {
    let poll: ChatPollItem | null = null;

    if (message.poll) {
      const totalVotes = message.poll.options.reduce(
        (sum, opt) => sum + (opt._count?.votes ?? 0),
        0
      );
      const myVoteOption = message.poll.options.find(
        (opt) => Array.isArray(opt.votes) && opt.votes.length > 0
      );

      poll = {
        id: message.poll.id,
        question: message.poll.question,
        expiresAt: message.poll.expiresAt,
        totalVotes,
        options: message.poll.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          votes: opt._count?.votes ?? 0,
          votedByMe: Array.isArray(opt.votes) && opt.votes.length > 0
        })),
        myVoteOptionId: myVoteOption?.id ?? null
      };
    }

    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      replyCount: message._count.replies ?? 0,
      reactions: reactionMap.get(message.id) ?? [],
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
        : null,
      attachments: message.deletedAt
        ? []
        : message.attachments.map((attachment) => ({
            id: attachment.id,
            url: attachment.url,
            mimeType: attachment.mimeType,
            size: attachment.size,
            width: attachment.width ?? null,
            height: attachment.height ?? null
          })),
      poll
    };
  }) as ChatMessageItem[];
}

export async function getPinnedMessage(channelId: string, userId?: string) {
  const pinned = await prisma.chatPinnedMessage.findUnique({
    where: {
      channelId
    },
    select: {
      id: true,
      messageId: true,
      pinnedAt: true,
      pinnedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      message: {
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
          attachments: {
            select: {
              id: true,
              url: true,
              mimeType: true,
              size: true,
              width: true,
              height: true
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
      }
    }
  });

  if (!pinned) {
    return null;
  }

  const reactions = await listReactionsForMessages([pinned.message.id], userId);

  return {
    id: pinned.id,
    messageId: pinned.messageId,
    pinnedAt: pinned.pinnedAt,
    pinnedBy: {
      id: pinned.pinnedBy.id,
      name: pinned.pinnedBy.name ?? pinned.pinnedBy.email ?? "Parish leader"
    },
    message: {
      id: pinned.message.id,
      body: pinned.message.body,
      createdAt: pinned.message.createdAt,
      editedAt: pinned.message.editedAt,
      deletedAt: pinned.message.deletedAt,
      replyCount: pinned.message._count.replies ?? 0,
      reactions: reactions.get(pinned.message.id) ?? [],
      author: {
        id: pinned.message.author.id,
        name: pinned.message.author.name ?? pinned.message.author.email ?? "Parish member"
      },
      attachments: pinned.message.deletedAt
        ? []
        : pinned.message.attachments.map((attachment) => ({
            id: attachment.id,
            url: attachment.url,
            mimeType: attachment.mimeType,
            size: attachment.size,
            width: attachment.width ?? null,
            height: attachment.height ?? null
          })),
      parentMessage: pinned.message.parentMessage
        ? {
            id: pinned.message.parentMessage.id,
            body: pinned.message.parentMessage.body,
            createdAt: pinned.message.parentMessage.createdAt,
            deletedAt: pinned.message.parentMessage.deletedAt,
            author: {
              id: pinned.message.parentMessage.author.id,
              name:
                pinned.message.parentMessage.author.name ??
                pinned.message.parentMessage.author.email ??
                "Parish member"
            }
          }
        : null
    }
  } as ChatPinnedMessageItem;
}

export async function listChannelMembers(parishId: string, channelId: string) {
  const parishMembers = await prisma.membership.findMany({
    where: {
      parishId
    },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  const channelMembers = await prisma.chatChannelMembership.findMany({
    where: {
      channelId
    },
    select: {
      userId: true,
      role: true
    }
  });

  const memberMap = new Map(channelMembers.map((member) => [member.userId, member.role]));

  return parishMembers.map((member) => ({
    userId: member.userId,
    name: member.user.name ?? member.user.email ?? "Parish member",
    email: member.user.email,
    parishRole: member.role,
    channelRole: memberMap.get(member.userId) ?? null,
    isMember: memberMap.has(member.userId)
  })) as ChatChannelMember[];
}
