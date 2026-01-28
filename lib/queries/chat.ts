import type { ChatChannelMembershipRole, ChatChannelType, ParishRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { isParishLeader } from "@/lib/permissions";
import { getNow as defaultGetNow } from "@/lib/time/getNow";

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

export type ChatMessageItem = {
  id: string;
  body: string;
  createdAt: Date;
  editedAt?: Date | null;
  deletedAt: Date | null;
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
  getNow?: () => Date;
};

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

  return channels
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

export async function listMessages({ channelId, cursor, limit = 50, getNow }: ListMessagesInput) {
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

  return messages.map((message) => ({
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
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
  })) as ChatMessageItem[];
}

export async function getPinnedMessage(channelId: string) {
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
      }
    }
  });

  if (!pinned) {
    return null;
  }

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
      author: {
        id: pinned.message.author.id,
        name: pinned.message.author.name ?? pinned.message.author.email ?? "Parish member"
      },
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
