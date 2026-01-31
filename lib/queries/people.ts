import type { ParishRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type ParishMemberRecord = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: ParishRole;
};

export type ParishInviteRecord = {
  id: string;
  email: string;
  role: ParishRole;
  createdAt: Date;
  invitedBy: {
    name: string | null;
    email: string;
  } | null;
};

export async function getPeopleList(parishId: string): Promise<ParishMemberRecord[]> {
  const memberships = await prisma.membership.findMany({
    where: { parishId },
    orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return memberships.map((membership) => ({
    id: membership.id,
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role
  }));
}

export async function getParishInvites(parishId: string): Promise<ParishInviteRecord[]> {
  const invites = await prisma.parishInvite.findMany({
    where: {
      parishId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      invitedBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.createdAt,
    invitedBy: invite.invitedBy
  }));
}
