"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
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
import {
  CHAT_ATTACHMENT_MIME_TYPES,
  MAX_CHAT_ATTACHMENT_SIZE,
  MAX_CHAT_ATTACHMENTS
} from "@/lib/chat/attachments";
import { notifyChatMessage } from "@/lib/push/notify";
import { notifyChatMessageInApp } from "@/lib/notifications/notify";

const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;
const REACTION_SET = new Set(REACTION_EMOJIS);

type ChatAttachmentInput = {
  url: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
};

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

function assertMessageInput(body: string, attachments: ChatAttachmentInput[]) {
  const trimmed = body.trim();
  if (!trimmed && attachments.length === 0) {
    throw new Error("Message cannot be empty");
  }
  if (trimmed.length > 1000) {
    throw new Error("Message is too long");
  }
  return trimmed;
}

const ATTACHMENT_URL_PREFIX = "/api/chat/images/chat/";

function assertAttachmentUrl(url: string) {
  if (!url) {
    throw new Error("Attachment URL is required");
  }

  if (!url.startsWith(ATTACHMENT_URL_PREFIX)) {
    throw new Error("Invalid attachment URL");
  }

  // Ensure no path traversal
  if (url.includes("..")) {
    throw new Error("Invalid attachment URL");
  }
}

function assertAttachments(attachments: ChatAttachmentInput[]) {
  if (attachments.length > MAX_CHAT_ATTACHMENTS) {
    throw new Error("Too many attachments");
  }

  for (const attachment of attachments) {
    assertAttachmentUrl(attachment.url);
    if (!CHAT_ATTACHMENT_MIME_TYPES.includes(attachment.mimeType)) {
      throw new Error("Invalid attachment type");
    }
    if (attachment.size <= 0 || attachment.size > MAX_CHAT_ATTACHMENT_SIZE) {
      throw new Error("Attachment file size is invalid");
    }
  }
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
  parentMessageIdOrGetNow?:
    | string
    | (() => Date)
    | { parentMessageId?: string; attachments?: ChatAttachmentInput[]; getNow?: () => Date },
  getNow?: () => Date
) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parentMessageId =
    typeof parentMessageIdOrGetNow === "string"
      ? parentMessageIdOrGetNow
      : parentMessageIdOrGetNow && typeof parentMessageIdOrGetNow === "object"
        ? parentMessageIdOrGetNow.parentMessageId
        : undefined;
  const attachments =
    parentMessageIdOrGetNow && typeof parentMessageIdOrGetNow === "object"
      ? parentMessageIdOrGetNow.attachments ?? []
      : [];
  const resolveNow =
    typeof parentMessageIdOrGetNow === "function"
      ? parentMessageIdOrGetNow
      : parentMessageIdOrGetNow && typeof parentMessageIdOrGetNow === "object"
        ? parentMessageIdOrGetNow.getNow ?? getNow
        : getNow;

  const { channel, parishMembership, groupMembership } = await requireChannelAccess(
    userId,
    parishId,
    channelId
  );

  if (channel.lockedAt) {
    throw new Error("Channel is locked");
  }

  assertAttachments(attachments);
  const trimmed = assertMessageInput(body, attachments);

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
      attachments: attachments.length
        ? {
            create: attachments.map((attachment) => ({
              url: attachment.url,
              mimeType: attachment.mimeType,
              size: attachment.size,
              width: attachment.width ?? null,
              height: attachment.height ?? null
            }))
          }
        : undefined,
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

  const result = {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
    replyCount: message._count.replies ?? 0,
    attachments: message.attachments.map((attachment) => ({
      id: attachment.id,
      url: attachment.url,
      mimeType: attachment.mimeType,
      size: attachment.size,
      width: attachment.width ?? null,
      height: attachment.height ?? null
    })),
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

  // Fire-and-forget push notification
  notifyChatMessage({
    channelId,
    authorId: userId,
    authorName: message.author.name ?? message.author.email ?? "Parish member",
    channelName: channel.type === "GROUP" ? "Group Chat" : "Parish Chat",
    parishId,
    messageBody: trimmed || "Shared an image"
  }).catch(() => {});

  notifyChatMessageInApp({
    channelId,
    authorId: userId,
    authorName: message.author.name ?? message.author.email ?? "Parish member",
    channelName: channel.type === "GROUP" ? "Group Chat" : "Parish Chat",
    parishId,
    messageBody: trimmed || "Shared an image"
  }).catch(() => {});

  return result;
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
    attachments: updated.attachments.map((attachment) => ({
      id: attachment.id,
      url: attachment.url,
      mimeType: attachment.mimeType,
      size: attachment.size,
      width: attachment.width ?? null,
      height: attachment.height ?? null
    })),
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

export async function createPoll(
  channelId: string,
  question: string,
  options: string[],
  expiresAt?: string | null
) {
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

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    throw new Error("Poll question cannot be empty");
  }
  if (trimmedQuestion.length > 300) {
    throw new Error("Poll question is too long");
  }

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  if (validOptions.length < 2) {
    throw new Error("Poll must have at least 2 options");
  }
  if (validOptions.length > 10) {
    throw new Error("Poll cannot have more than 10 options");
  }

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

  const now = defaultGetNow();

  // Create the message and poll atomically
  const message = await prisma.chatMessage.create({
    data: {
      channelId: channel.id,
      authorId: userId,
      body: `📊 ${trimmedQuestion}`,
      createdAt: now,
      poll: {
        create: {
          question: trimmedQuestion,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdAt: now,
          options: {
            create: validOptions.map((label, index) => ({
              label,
              order: index
            }))
          }
        }
      }
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
          createdAt: true,
          options: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              label: true,
              order: true,
              _count: {
                select: { votes: true }
              }
            }
          }
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
    attachments: [],
    author: {
      id: message.author.id,
      name: message.author.name ?? message.author.email ?? "Parish member"
    },
    parentMessage: null,
    poll: message.poll
      ? {
          id: message.poll.id,
          question: message.poll.question,
          expiresAt: message.poll.expiresAt,
          totalVotes: 0,
          options: message.poll.options.map((opt) => ({
            id: opt.id,
            label: opt.label,
            votes: 0,
            votedByMe: false
          })),
          myVoteOptionId: null
        }
      : null
  };
}

export async function votePoll(pollId: string, optionId: string) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const poll = await prisma.chatPoll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      expiresAt: true,
      message: {
        select: { channelId: true }
      },
      options: {
        select: { id: true }
      }
    }
  });

  if (!poll) {
    throw new Error("Not found");
  }

  await requireChannelAccess(userId, parishId, poll.message.channelId);

  if (poll.expiresAt && poll.expiresAt < new Date()) {
    throw new Error("Poll has expired");
  }

  const validOptionIds = new Set(poll.options.map((o) => o.id));
  if (!validOptionIds.has(optionId)) {
    throw new Error("Invalid option");
  }

  // Remove any existing vote for this poll by this user, then add new vote.
  // This ensures single-vote-per-user semantics.
  await prisma.$transaction(async (tx) => {
    await tx.chatPollVote.deleteMany({
      where: {
        userId,
        option: {
          pollId: poll.id
        }
      }
    });

    await tx.chatPollVote.create({
      data: {
        optionId,
        userId
      }
    });
  });

  // Return updated poll data
  const updated = await prisma.chatPoll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      question: true,
      expiresAt: true,
      options: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          _count: { select: { votes: true } },
          votes: {
            where: { userId },
            select: { id: true }
          }
        }
      }
    }
  });

  if (!updated) {
    throw new Error("Not found");
  }

  const totalVotes = updated.options.reduce((sum, opt) => sum + opt._count.votes, 0);
  const myVoteOption = updated.options.find((opt) => opt.votes.length > 0);

  return {
    id: updated.id,
    question: updated.question,
    expiresAt: updated.expiresAt,
    totalVotes,
    options: updated.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      votes: opt._count.votes,
      votedByMe: opt.votes.length > 0
    })),
    myVoteOptionId: myVoteOption?.id ?? null
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

  // Revalidate pages that display unread badge counts so they reflect
  // the updated read state when the user navigates back.
  revalidatePath("/groups", "page");
  revalidatePath("/community/chat", "page");

  return {
    roomId: state.roomId,
    lastReadAt: state.lastReadAt
  };
}
