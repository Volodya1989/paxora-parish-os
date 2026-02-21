import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { signR2GetUrl } from "@/lib/storage/r2";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getGroupMembership, getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif"
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const parishId = session.user.activeParishId;

  if (!parishId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { key } = await ctx.params;
  const objectKey = key.join("/");

  // Only allow files under the chat/ prefix
  if (!objectKey.startsWith("chat/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const segments = objectKey.split("/");
  if (segments.length !== 3 || segments[0] !== "chat" || !segments[1] || !segments[2]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const channelId = segments[1];

  const extension = objectKey.split(".").pop()?.toLowerCase() ?? "";
  if (!MIME_TYPES[extension]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const [parishMembership, channel] = await Promise.all([
      getParishMembership(parishId, userId),
      prisma.chatChannel.findFirst({
        where: {
          id: channelId,
          parishId
        },
        select: {
          id: true,
          groupId: true,
          type: true
        }
      })
    ]);

    if (!parishMembership || !channel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isLeader = isParishLeader(parishMembership.role);

    if (channel.type === "GROUP") {
      if (!channel.groupId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (!isLeader) {
        const groupMembership = await getGroupMembership(channel.groupId, userId);
        if (!groupMembership || groupMembership.status !== "ACTIVE") {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
      }
    } else if (!isLeader) {
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
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const url = signR2GetUrl({ key: objectKey, expiresInSeconds: 60 * 10 });
    const r2Response = await fetch(url);

    if (!r2Response.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = r2Response.body;
    const contentType = MIME_TYPES[extension] ?? "application/octet-stream";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "Unable to fetch image" }, { status: 502 });
  }
}
