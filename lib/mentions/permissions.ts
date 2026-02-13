import { isParishLeader } from "@/lib/permissions";
import { prisma } from "@/server/db/prisma";
import { getGroupMembership, getParishMembership } from "@/server/db/groups";

export type MentionableUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

function displayName(name: string | null, email: string | null) {
  return name ?? email?.split("@")[0] ?? "Parish member";
}

export async function listMentionableUsersForChannel({
  parishId,
  actorUserId,
  channelId,
  query
}: {
  parishId: string;
  actorUserId: string;
  channelId: string;
  query?: string;
}) {
  const [membership, channel] = await Promise.all([
    getParishMembership(parishId, actorUserId),
    prisma.chatChannel.findFirst({ where: { id: channelId, parishId }, select: { id: true, type: true, groupId: true } })
  ]);

  if (!membership || !channel) {
    throw new Error("Forbidden");
  }

  const isLeader = isParishLeader(membership.role);
  const q = query?.trim().toLowerCase();

  let allowedIds: string[] = [];

  if (channel.type === "GROUP" && channel.groupId) {
    if (!isLeader) {
      const gm = await getGroupMembership(channel.groupId, actorUserId);
      if (!gm || gm.status !== "ACTIVE") throw new Error("Forbidden");
    }

    const [groupMembers, leaders] = await Promise.all([
      prisma.groupMembership.findMany({ where: { groupId: channel.groupId, status: "ACTIVE" }, select: { userId: true } }),
      prisma.membership.findMany({ where: { parishId, role: { in: ["ADMIN", "SHEPHERD"] } }, select: { userId: true } })
    ]);
    allowedIds = [...groupMembers.map((m) => m.userId), ...leaders.map((m) => m.userId)];
  } else {
    const channelMembers = await prisma.chatChannelMembership.findMany({ where: { channelId }, select: { userId: true } });
    if (channelMembers.length > 0 && !isLeader) {
      if (!channelMembers.some((member) => member.userId === actorUserId)) throw new Error("Forbidden");
      allowedIds = channelMembers.map((m) => m.userId);
    } else {
      const members = await prisma.membership.findMany({ where: { parishId }, select: { userId: true } });
      allowedIds = members.map((m) => m.userId);
    }
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: Array.from(new Set(allowedIds)) },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }],
    take: q ? 10 : 200
  });

  return users.map((user) => ({ id: user.id, name: displayName(user.name, user.email), email: user.email, avatarUrl: null }));
}

export async function listMentionableUsersForTask({ parishId, actorUserId, taskId, query }: { parishId: string; actorUserId: string; taskId: string; query?: string }) {
  const [membership, task] = await Promise.all([
    getParishMembership(parishId, actorUserId),
    prisma.task.findFirst({ where: { id: taskId, parishId, archivedAt: null }, select: { id: true, visibility: true, approvalStatus: true, groupId: true, ownerId: true, createdById: true } })
  ]);

  if (!membership || !task) throw new Error("Forbidden");
  const isLeader = isParishLeader(membership.role);
  const isOwnerOrCreator = task.ownerId === actorUserId || task.createdById === actorUserId;
  if (!isOwnerOrCreator) {
    if (task.visibility === "PRIVATE") throw new Error("Forbidden");
    if (task.approvalStatus !== "APPROVED") throw new Error("Forbidden");
  }

  let allowedIds: string[];
  if (task.groupId) {
    const [groupMembers, leaders] = await Promise.all([
      prisma.groupMembership.findMany({ where: { groupId: task.groupId, status: "ACTIVE" }, select: { userId: true } }),
      prisma.membership.findMany({ where: { parishId, role: { in: ["ADMIN", "SHEPHERD"] } }, select: { userId: true } })
    ]);
    if (!isLeader && !groupMembers.some((member) => member.userId === actorUserId)) throw new Error("Forbidden");
    allowedIds = [...groupMembers.map((m) => m.userId), ...leaders.map((m) => m.userId)];
  } else {
    const members = await prisma.membership.findMany({ where: { parishId }, select: { userId: true } });
    allowedIds = members.map((m) => m.userId);
  }

  const q = query?.trim().toLowerCase();
  const users = await prisma.user.findMany({
    where: {
      id: { in: Array.from(new Set(allowedIds)) },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }],
    take: q ? 10 : 200
  });

  return users.map((user) => ({ id: user.id, name: displayName(user.name, user.email), email: user.email, avatarUrl: null }));
}
