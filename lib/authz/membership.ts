import { prisma } from "@/server/db/prisma";
import type { GroupMembershipStatus, GroupRole, ParishRole } from "@prisma/client";

export function isAdminClergy(role?: ParishRole | null) {
  return role === "ADMIN" || role === "SHEPHERD";
}

type GroupAccessContext = {
  groupId: string;
  parishId: string;
  parishRole: ParishRole | null;
  groupRole: GroupRole | null;
  groupMembershipStatus: GroupMembershipStatus | null;
};

async function getGroupAccessContext(userId: string, groupId: string): Promise<GroupAccessContext> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, parishId: true }
  });

  if (!group) {
    throw new Error("Group not found");
  }

  const [parishMembership, groupMembership] = await Promise.all([
    prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId: group.parishId,
          userId
        }
      },
      select: { role: true }
    }),
    prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId
        }
      },
      select: { role: true, status: true }
    })
  ]);

  return {
    groupId: group.id,
    parishId: group.parishId,
    parishRole: parishMembership?.role ?? null,
    groupRole: groupMembership?.status === "ACTIVE" ? groupMembership.role : null,
    groupMembershipStatus: groupMembership?.status ?? null
  };
}

export async function getUserGroupRole(userId: string, groupId: string) {
  const membership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId
      }
    },
    select: { role: true, status: true }
  });

  if (!membership || membership.status !== "ACTIVE") {
    return null;
  }

  return membership.role;
}

export async function requireGroupMember(userId: string, groupId: string) {
  const context = await getGroupAccessContext(userId, groupId);

  if (isAdminClergy(context.parishRole)) {
    return context;
  }

  if (context.groupMembershipStatus === "ACTIVE") {
    return context;
  }

  throw new Error("Unauthorized");
}

export async function requireCoordinatorOrAdmin(userId: string, groupId: string) {
  const context = await getGroupAccessContext(userId, groupId);

  if (isAdminClergy(context.parishRole)) {
    return context;
  }

  if (context.groupMembershipStatus === "ACTIVE" && context.groupRole === "LEAD") {
    return context;
  }

  throw new Error("Forbidden");
}
