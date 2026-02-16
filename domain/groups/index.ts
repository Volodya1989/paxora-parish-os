import { getOrCreateCurrentWeek } from "@/domain/week";
import {
  getGroupByParishId,
  getParishMembership,
  listGroupsByParish
} from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";

type GroupAccessInput = {
  parishId: string;
  actorUserId: string;
};

type GroupDetailInput = GroupAccessInput & {
  groupId: string;
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
