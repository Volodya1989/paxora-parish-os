import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { isParishLeader } from "@/lib/permissions";
import { signR2PutUrl } from "@/lib/storage/r2";
import {
  avatarExtensionFromMime,
  buildAvatarImagePath,
  buildGroupAvatarKey,
  isSupportedAvatarMimeType,
  MAX_AVATAR_SIZE
} from "@/lib/storage/avatar";

async function canManageGroupAvatar(groupId: string, userId: string, parishId: string) {
  const [membership, groupMembership] = await Promise.all([
    prisma.membership.findUnique({
      where: { parishId_userId: { parishId, userId } },
      select: { role: true }
    }),
    prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { role: true, status: true }
    })
  ]);

  if (!membership) {
    return false;
  }

  if (isParishLeader(membership.role)) {
    return true;
  }

  return groupMembership?.status === "ACTIVE" && groupMembership.role === "COORDINATOR";
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await ctx.params;
  const group = await prisma.group.findFirst({
    where: { id: groupId, parishId: session.user.activeParishId },
    select: { id: true }
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canManage = await canManageGroupAvatar(
    groupId,
    session.user.id,
    session.user.activeParishId
  );

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const key = buildGroupAvatarKey(groupId, extension);
  const uploadUrl = signR2PutUrl({
    key,
    contentType: entry.type,
    expiresInSeconds: 60 * 5
  });

  const r2Response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": entry.type },
    body: await entry.arrayBuffer()
  });

  if (!r2Response.ok) {
    return NextResponse.json({ error: "Failed to upload" }, { status: 502 });
  }

  await prisma.group.update({ where: { id: groupId }, data: { avatarKey: key } });

  return NextResponse.json({ avatarKey: key, avatarUrl: buildAvatarImagePath(key) });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await ctx.params;
  const group = await prisma.group.findFirst({
    where: { id: groupId, parishId: session.user.activeParishId },
    select: { id: true }
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canManage = await canManageGroupAvatar(
    groupId,
    session.user.id,
    session.user.activeParishId
  );

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.group.update({ where: { id: groupId }, data: { avatarKey: null } });

  return NextResponse.json({ success: true });
}
