import { getOrCreateCurrentWeek } from "@/domain/week";
import { canManageGroupMembership } from "@/lib/permissions";
import {
  getGroupByParishId,
  getGroupMembership,
  getParishMembership,
  listGroupsByParish,
  upsertGroupMembership
} from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";

type GroupAccessInput = {
  parishId: string;
  actorUserId: string;
};

type GroupDetailInput = GroupAccessInput & {
  groupId: string;
};

type UpdateGroupMembershipInput = {
  parishId: string;
  groupId: string;
  targetUserId: string;
  role: "COORDINATOR" | "PARISHIONER";
  actorUserId: string;
};

export async function listGroups({ parishId, actorUserId }: GroupAccessInput) {
  const membership = await getParishMembership(parishId, actorUserId);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  return listGroupsByParish(parishId);
}

export async function getGroupDetail({ parishId, groupId, actorUserId }: GroupDetailInput) {
  const membership = await getParishMembership(parishId, actorUserId);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  const group = await getGroupByParishId(parishId, groupId);

  if (!group) {
    throw new Error("Group not found");
  }

  const week = await getOrCreateCurrentWeek(parishId);

  const [members, tasks] = await Promise.all([
    prisma.groupMembership.findMany({
      where: { groupId, status: "ACTIVE" },
      orderBy: { userId: "asc" },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.task.findMany({
      where: {
        parishId,
        groupId,
        weekId: week.id
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        notes: true,
        status: true,
        ownerId: true,
        groupId: true,
        weekId: true
      }
    })
  ]);

  return {
    group: {
      id: group.id,
      name: group.name,
      description: group.description ?? null
    },
    members: members.map((member) => ({
      ...member.user,
      role: member.role
    })),
    tasks
  };
}

export async function updateGroupMembership({
  parishId,
  groupId,
  targetUserId,
  role,
  actorUserId
}: UpdateGroupMembershipInput) {
  const group = await getGroupByParishId(parishId, groupId);

  if (!group) {
    throw new Error("Group not found");
  }

  const [parishMembership, groupMembership, targetMembership] = await Promise.all([
    getParishMembership(parishId, actorUserId),
    getGroupMembership(groupId, actorUserId),
    getParishMembership(parishId, targetUserId)
  ]);

  if (!parishMembership) {
    throw new Error("Unauthorized");
  }

  const groupRole = groupMembership?.status === "ACTIVE" ? groupMembership.role : null;
  if (!canManageGroupMembership(parishMembership.role, groupRole)) {
    throw new Error("Forbidden");
  }

  if (!targetMembership) {
    throw new Error("User not in parish");
  }

  await upsertGroupMembership({
    groupId,
    userId: targetUserId,
    role
  });

  return { success: true };
}
