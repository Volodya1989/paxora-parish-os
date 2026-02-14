import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { isParishLeader } from "@/lib/permissions";
import { signR2GetUrl } from "@/lib/storage/r2";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

function resolveTypeFromKey(objectKey: string) {
  const extension = objectKey.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[extension] ?? null;
}

async function canAccessUserAvatar(objectKey: string, userId: string, parishId: string) {
  const [, targetUserId] = objectKey.split("/");
  if (!targetUserId) {
    return false;
  }

  const [viewerMembership, targetMembership] = await Promise.all([
    prisma.membership.findUnique({
      where: { parishId_userId: { parishId, userId } },
      select: { id: true }
    }),
    prisma.membership.findUnique({
      where: { parishId_userId: { parishId, userId: targetUserId } },
      select: { id: true }
    })
  ]);

  return Boolean(viewerMembership && targetMembership);
}

async function canAccessGroupAvatar(objectKey: string, userId: string, parishId: string) {
  const [, groupId] = objectKey.split("/");
  if (!groupId) {
    return false;
  }

  const [viewerParishMembership, group] = await Promise.all([
    prisma.membership.findUnique({
      where: { parishId_userId: { parishId, userId } },
      select: { role: true }
    }),
    prisma.group.findFirst({
      where: { id: groupId, parishId },
      select: { id: true, visibility: true, status: true }
    })
  ]);

  if (!viewerParishMembership || !group) {
    return false;
  }

  if (isParishLeader(viewerParishMembership.role)) {
    return true;
  }

  if (group.visibility === "PUBLIC" && group.status === "ACTIVE") {
    return true;
  }

  const membership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId
      }
    },
    select: { status: true }
  });

  return membership?.status === "ACTIVE";
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await ctx.params;
  const objectKey = key.join("/");
  const contentType = resolveTypeFromKey(objectKey);

  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id: userId, activeParishId: parishId } = session.user;

  const isAuthorized = objectKey.startsWith("users/")
    ? await canAccessUserAvatar(objectKey, userId, parishId)
    : objectKey.startsWith("groups/")
      ? await canAccessGroupAvatar(objectKey, userId, parishId)
      : false;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const url = signR2GetUrl({ key: objectKey, expiresInSeconds: 60 * 10 });
    const r2Response = await fetch(url);

    if (!r2Response.ok || !r2Response.body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(r2Response.body, {
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
