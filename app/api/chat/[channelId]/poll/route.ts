import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { listChannelsForUser, listMessages, getPinnedMessage, getChannelReadIndicatorSnapshot } from "@/lib/queries/chat";

function serializeMessage(message: Awaited<ReturnType<typeof listMessages>>[number]) {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
    replyCount: message.replyCount,
    reactions: message.reactions,
    attachments: message.attachments,
    parentMessage: message.parentMessage
      ? {
          ...message.parentMessage,
          createdAt: message.parentMessage.createdAt.toISOString(),
          deletedAt: message.parentMessage.deletedAt
            ? message.parentMessage.deletedAt.toISOString()
            : null
        }
      : null,
    poll: message.poll
      ? {
          ...message.poll,
          expiresAt: message.poll.expiresAt
            ? new Date(message.poll.expiresAt).toISOString()
            : null
        }
      : null
  };
}

function serializePinned(pinned: Awaited<ReturnType<typeof getPinnedMessage>>) {
  if (!pinned) {
    return null;
  }

  return {
    ...pinned,
    pinnedAt: pinned.pinnedAt.toISOString(),
    message: {
      ...pinned.message,
      createdAt: pinned.message.createdAt.toISOString(),
      editedAt: pinned.message.editedAt ? pinned.message.editedAt.toISOString() : null,
      deletedAt: pinned.message.deletedAt ? pinned.message.deletedAt.toISOString() : null,
      replyCount: pinned.message.replyCount,
      reactions: pinned.message.reactions,
      attachments: pinned.message.attachments,
      parentMessage: pinned.message.parentMessage
        ? {
            ...pinned.message.parentMessage,
            createdAt: pinned.message.parentMessage.createdAt.toISOString(),
            deletedAt: pinned.message.parentMessage.deletedAt
              ? pinned.message.parentMessage.deletedAt.toISOString()
              : null
          }
        : null
    }
  };
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await ctx.params; // ✅ unwrap promise params

  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parishId = session.user.activeParishId;
  const userId = session.user.id;

  // ✅ don't turn DB errors into 403
  const channels = await listChannelsForUser(parishId, userId);

  const channel = channels.find((item) => item.id === channelId);
  if (!channel) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cursorId = searchParams.get("cursor");
  const targetMessageId = searchParams.get("msg");

  let cursor:
    | {
      createdAt: Date;
      id: string;
    }
    | undefined;

  if (cursorId) {
    const cursorMessage = await prisma.chatMessage.findUnique({
      where: { id: cursorId },
      select: { id: true, createdAt: true, channelId: true }
    });

    if (cursorMessage && cursorMessage.channelId === channelId) {
      cursor = { id: cursorMessage.id, createdAt: cursorMessage.createdAt };
    }
  }



  if (targetMessageId) {
    const [messages, pinned, target, readIndicatorSnapshot] = await Promise.all([
      listMessages({ channelId, cursor, limit: 50, userId }),
      getPinnedMessage(channelId, userId),
      prisma.chatMessage.findFirst({ where: { id: targetMessageId, channelId }, select: { id: true } }),
      getChannelReadIndicatorSnapshot(parishId, channelId, userId)
    ]);

    if (target && !messages.some((message) => message.id === targetMessageId)) {
      const around = await listMessages({ channelId, limit: 200, userId });
      return NextResponse.json({
        messages: around.map(serializeMessage),
        pinnedMessage: serializePinned(pinned),
        lockedAt: channel.lockedAt ? channel.lockedAt.toISOString() : null,
        readIndicatorSnapshot
      });
    }

    return NextResponse.json({
      messages: messages.map(serializeMessage),
      pinnedMessage: serializePinned(pinned),
      lockedAt: channel.lockedAt ? channel.lockedAt.toISOString() : null,
      readIndicatorSnapshot
    });
  }

  const [messages, pinned, readIndicatorSnapshot] = await Promise.all([
    listMessages({ channelId, cursor, limit: 50, userId }),
    getPinnedMessage(channelId, userId),
    getChannelReadIndicatorSnapshot(parishId, channelId, userId)
  ]);

  return NextResponse.json({
    messages: messages.map(serializeMessage),
    pinnedMessage: serializePinned(pinned),
    lockedAt: channel.lockedAt ? channel.lockedAt.toISOString() : null,
    readIndicatorSnapshot
  });
}
