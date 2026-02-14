import type {
  GroupJoinPolicy,
  GroupMembershipStatus,
  GroupRole,
  GroupStatus,
  GroupVisibility,
  ParishRole
} from "@prisma/client";
import { isAdminClergy } from "@/lib/authz/membership";
import { prisma } from "@/server/db/prisma";
import { listUnreadCountsForRooms } from "@/lib/queries/chat";

type GroupListRecord = {
  id: string;
  createdById: string;
  name: string;
  description: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  status: GroupStatus;
  visibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
  createdBy?: {
    name: string | null;
    email: string;
  } | null;
  memberships?: Array<{ status: GroupMembershipStatus; role: GroupRole }>;
  _count?: {
    memberships: number;
  };
};

export type GroupListItem = {
  id: string;
  createdById: string;
  name: string;
  description: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  status: GroupStatus;
  visibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
  createdBy: {
    name: string | null;
    email: string;
  } | null;
  memberCount: number | null;
  viewerMembershipStatus: GroupMembershipStatus | null;
  viewerMembershipRole: GroupRole | null;
  unreadCount?: number | null;
};

export type GroupInviteCandidate = {
  id: string;
  name: string;
  email: string;
};

export async function listGroups(
  parishId: string,
  actorUserId: string,
  parishRole: ParishRole,
  includeArchived = true
) {
  const canSeePrivate = isAdminClergy(parishRole);
  const canSeePending = isAdminClergy(parishRole);
  const baseWhere = {
    parishId,
    ...(includeArchived ? {} : { archivedAt: null })
  };

  const visibilityClause = canSeePrivate
    ? {}
    : {
        OR: [
          { visibility: "PUBLIC", status: "ACTIVE" },
          {
            memberships: {
              some: {
                userId: actorUserId,
                status: { in: ["ACTIVE", "INVITED", "REQUESTED"] }
              }
            }
          }
        ]
      };

  const statusClause = canSeePending ? {} : { status: "ACTIVE" };

  const groups = (await prisma.group.findMany({
    where: canSeePrivate && canSeePending
      ? baseWhere
      : {
          ...baseWhere,
          OR: [
            { createdById: actorUserId },
            {
              ...statusClause,
              ...visibilityClause
            }
          ]
        },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      createdById: true,
      name: true,
      description: true,
      createdAt: true,
      archivedAt: true,
      status: true,
      visibility: true,
      joinPolicy: true,
      createdBy: {
        select: {
          name: true,
          email: true
        }
      },
      memberships: {
        where: {
          userId: actorUserId
        },
        select: {
          status: true,
          role: true
        }
      },
      _count: {
        select: {
          memberships: {
            where: { status: "ACTIVE" }
          }
        }
      }
    }
  } as any)) as unknown as GroupListRecord[];

  const memberGroupIds = groups
    .filter((group) => group.memberships?.[0]?.status === "ACTIVE")
    .map((group) => group.id);
  const chatChannels = await prisma.chatChannel.findMany({
    where: {
      groupId: {
        in: memberGroupIds.length ? memberGroupIds : ["__none__"]
      },
      type: "GROUP"
    },
    select: {
      id: true,
      groupId: true
    }
  });

  const roomIds = chatChannels.map((channel) => channel.id);
  const unreadCounts = await listUnreadCountsForRooms(roomIds, actorUserId);
  const groupToRoomMap = new Map(chatChannels.map((channel) => [channel.groupId, channel.id]));

  return groups.map((group) => ({
    id: group.id,
    createdById: group.createdById,
    name: group.name,
    description: group.description,
    createdAt: group.createdAt,
    archivedAt: group.archivedAt,
    status: group.status,
    visibility: group.visibility,
    joinPolicy: group.joinPolicy,
    createdBy: group.createdBy ?? null,
    memberCount: group._count?.memberships ?? null,
    viewerMembershipStatus: group.memberships?.[0]?.status ?? null,
    viewerMembershipRole: group.memberships?.[0]?.role ?? null,
    unreadCount: groupToRoomMap.has(group.id)
      ? unreadCounts.get(groupToRoomMap.get(group.id)!) ?? 0
      : null
  }));
}

export async function listGroupInviteCandidates(parishId: string, actorUserId: string) {
  const memberships = await prisma.membership.findMany({
    where: { parishId },
    orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return memberships
    .filter((membership) => membership.user.id !== actorUserId)
    .map((membership) => ({
      id: membership.user.id,
      name: membership.user.name ?? membership.user.email,
      email: membership.user.email
    }));
}
