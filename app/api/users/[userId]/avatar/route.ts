import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { signR2PutUrl } from "@/lib/storage/r2";
import {
  avatarExtensionFromMime,
  buildAvatarImagePath,
  buildUserAvatarKey,
  isSupportedAvatarMimeType,
  MAX_AVATAR_SIZE
} from "@/lib/storage/avatar";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await ctx.params;
  if (session.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: session.user.activeParishId,
        userId
      }
    },
    select: { id: true }
  });

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const entry = formData?.get("file");

  if (!(entry instanceof File)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  if (!isSupportedAvatarMimeType(entry.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  if (entry.size <= 0 || entry.size > MAX_AVATAR_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const extension = avatarExtensionFromMime(entry.type);
  if (!extension) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const key = buildUserAvatarKey(userId, extension);
  const uploadUrl = signR2PutUrl({
    key,
    contentType: entry.type,
    expiresInSeconds: 60 * 5
  });

  const r2Response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": entry.type
    },
    body: await entry.arrayBuffer()
  });

  if (!r2Response.ok) {
    return NextResponse.json({ error: "Failed to upload" }, { status: 502 });
  }

  await prisma.user.update({ where: { id: userId }, data: { avatarKey: key } });

  return NextResponse.json({ avatarKey: key, avatarUrl: buildAvatarImagePath(key) });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await ctx.params;
  if (session.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.user.update({ where: { id: userId }, data: { avatarKey: null } });

  return NextResponse.json({ success: true });
}
