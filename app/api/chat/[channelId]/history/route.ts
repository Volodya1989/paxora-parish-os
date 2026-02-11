import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { listChannelsForUser, listOlderMessages } from "@/lib/queries/chat";

function serializeMessage(
  message: Awaited<ReturnType<typeof listOlderMessages>>["messages"][number]
) {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
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
          expiresAt: message.poll.expiresAt ? message.poll.expiresAt.toISOString() : null
        }
      : null
  };
}

export async function GET(request: Request, ctx: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await ctx.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const parishId = session.user.activeParishId;

  const channels = await listChannelsForUser(parishId, userId);
  const channel = channels.find((item) => item.id === channelId);

  if (!channel) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const beforeId = searchParams.get("before");

  if (!beforeId) {
    return NextResponse.json({ error: "before is required" }, { status: 400 });
  }

  const beforeMessage = await prisma.chatMessage.findUnique({
    where: { id: beforeId },
    select: { id: true, createdAt: true, channelId: true }
  });

  if (!beforeMessage || beforeMessage.channelId !== channelId) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  const older = await listOlderMessages({
    channelId,
    before: {
      id: beforeMessage.id,
      createdAt: beforeMessage.createdAt
    },
    limit: 30,
    userId
  });

  return NextResponse.json({
    messages: older.messages.map(serializeMessage),
    hasMore: older.hasMore
  });
}
