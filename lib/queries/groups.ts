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
                status: "ACTIVE"
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
    viewerMembershipRole: group.memberships?.[0]?.role ?? null
  }));
}
