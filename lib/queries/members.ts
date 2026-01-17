import { prisma } from "@/server/db/prisma";
import type { GroupMembershipStatus, GroupRole, ParishRole } from "@prisma/client";

export type GroupMemberRecord = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: GroupRole;
  parishRole: ParishRole | null;
};

export type PendingInviteRecord = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: GroupRole;
  status: GroupMembershipStatus;
  invitedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdAt: Date;
};

export type MembershipSummary = {
  groupId: string;
  groupName: string;
  role: GroupRole;
  status: GroupMembershipStatus;
};

export async function getGroupMembers(groupId: string): Promise<GroupMemberRecord[]> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { parishId: true }
  });

  if (!group) {
    throw new Error("Group not found");
  }

  const memberships = await prisma.groupMembership.findMany({
    where: { groupId, status: "ACTIVE" },
    orderBy: { user: { name: "asc" } },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          memberships: {
            where: { parishId: group.parishId },
            select: { role: true }
          }
        }
      }
    }
  });

  return memberships.map((membership) => ({
    id: membership.id,
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    parishRole: membership.user.memberships[0]?.role ?? null
  }));
}

export async function getPendingInvites(groupId: string): Promise<PendingInviteRecord[]> {
  const invites = await prisma.groupMembership.findMany({
    where: { groupId, status: { in: ["INVITED", "REQUESTED"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      role: true,
      status: true,
      invitedEmail: true,
      createdAt: true,
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      user: {
        select: {
          email: true,
          name: true
        }
      }
    }
  });

  return invites.map((invite) => ({
    id: invite.id,
    userId: invite.userId,
    name: invite.user.name,
    email: invite.invitedEmail ?? invite.user.email,
    role: invite.role,
    status: invite.status,
    invitedBy: invite.invitedBy,
    createdAt: invite.createdAt
  }));
}

export async function getMyMemberships(userId: string): Promise<MembershipSummary[]> {
  const memberships = await prisma.groupMembership.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      groupId: true,
      role: true,
      status: true,
      group: {
        select: {
          name: true
        }
      }
    }
  });

  return memberships.map((membership) => ({
    groupId: membership.groupId,
    groupName: membership.group.name,
    role: membership.role,
    status: membership.status
  }));
}
