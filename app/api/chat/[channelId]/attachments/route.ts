import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import {
  getGroupMembership,
  getParishMembership,
  isCoordinatorInParish
} from "@/server/db/groups";
import {
  canPostAnnouncementChannel,
  canPostGroupChannel,
  isParishLeader
} from "@/lib/permissions";
import {
  CHAT_ATTACHMENT_MIME_TYPES,
  MAX_CHAT_ATTACHMENT_SIZE,
  MAX_CHAT_ATTACHMENTS
} from "@/lib/chat/attachments";
import { createR2Client, getR2Config } from "@/lib/storage/r2";

function assertSession(session: Awaited<ReturnType<typeof getServerSession>>) {
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

function getExtensionFromMime(mimeType: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  };

  return map[mimeType] ?? "";
}

type AttachmentRequest = {
  name: string;
  type: string;
  size: number;
};

export async function POST(
  request: Request,
  ctx: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await ctx.params;
  const session = await getServerSession(authOptions);

  try {
    const { userId, parishId } = assertSession(session);
    const { channel, parishMembership, groupMembership } = await requireChannelAccess(
      userId,
      parishId,
      channelId
    );

    if (channel.lockedAt) {
      return NextResponse.json({ error: "Channel is locked" }, { status: 403 });
    }

    if (channel.type === "ANNOUNCEMENT") {
      const isCoordinator = await isCoordinatorInParish(parishId, userId);
      if (!canPostAnnouncementChannel(parishMembership.role, isCoordinator)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (channel.type === "GROUP") {
      const isMember = Boolean(groupMembership && groupMembership.status === "ACTIVE");
      if (!canPostGroupChannel(parishMembership.role, isMember)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = (await request.json().catch(() => null)) as { files?: AttachmentRequest[] } | null;
    const files = body?.files ?? [];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_CHAT_ATTACHMENTS) {
      return NextResponse.json({ error: "Too many attachments" }, { status: 400 });
    }

    const { bucket, publicUrl } = getR2Config();
    const r2Client = createR2Client();
    const attachments = [];

    for (const file of files) {
      if (!CHAT_ATTACHMENT_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
      }
      if (file.size > MAX_CHAT_ATTACHMENT_SIZE) {
        return NextResponse.json({ error: "File too large" }, { status: 400 });
      }

      const extension =
        getExtensionFromMime(file.type) || file.name.split(".").pop()?.toLowerCase();
      const key = `chat/${channelId}/${randomUUID()}${extension ? `.${extension}` : ""}`;
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: file.type,
        ContentLength: file.size
      });
      const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 * 5 });

      attachments.push({
        uploadUrl,
        attachment: {
          url: `${publicUrl}/${key}`,
          mimeType: file.type,
          size: file.size,
          width: null,
          height: null
        }
      });
    }

    return NextResponse.json({ attachments });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to upload attachments" }, { status: 500 });
  }
}
