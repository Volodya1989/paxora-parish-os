import type {
  GroupJoinPolicy,
  GroupMembershipStatus,
  GroupRole,
  GroupVisibility,
  ParishRole
} from "@prisma/client";
import { isAdminClergy } from "@/lib/authz/membership";
import { prisma } from "@/server/db/prisma";

type GroupListRecord = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  visibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
  memberships?: Array<{ status: GroupMembershipStatus; role: GroupRole }>;
  _count?: {
    memberships: number;
  };
};

export type GroupListItem = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  visibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
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
  const groups = (await prisma.group.findMany({
    where: {
      parishId,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...(canSeePrivate
        ? {}
        : {
            OR: [
              { visibility: "PUBLIC" },
              {
                memberships: {
                  some: {
                    userId: actorUserId,
                    status: "ACTIVE"
                  }
                }
              }
            ]
          })
    },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      archivedAt: true,
      visibility: true,
      joinPolicy: true,
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
    name: group.name,
    description: group.description,
    createdAt: group.createdAt,
    archivedAt: group.archivedAt,
    visibility: group.visibility,
    joinPolicy: group.joinPolicy,
    memberCount: group._count?.memberships ?? null,
    viewerMembershipStatus: group.memberships?.[0]?.status ?? null,
    viewerMembershipRole: group.memberships?.[0]?.role ?? null
  }));
}
