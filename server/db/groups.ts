import { prisma } from "@/server/db/prisma";

export async function getParishMembership(parishId: string, userId: string) {
  return prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId
      }
    },
    select: {
      id: true,
      role: true
    }
  });
}

export async function getGroupMembership(groupId: string, userId: string) {
  return prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId
      }
    },
    select: {
      id: true,
      role: true,
      status: true
    }
  });
}

export async function listGroupsByParish(parishId: string) {
  return prisma.group.findMany({
    where: { parishId, archivedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true
    }
  } as any);
}

export async function getGroupByParishId(parishId: string, groupId: string) {
  return prisma.group.findFirst({
    where: {
      id: groupId,
      parishId
    },
    select: {
      id: true,
      name: true,
      description: true,
      parishId: true
    }
  });
}

export async function upsertGroupMembership(input: {
  groupId: string;
  userId: string;
  role: "LEAD" | "MEMBER";
}) {
  return prisma.groupMembership.upsert({
    where: {
      groupId_userId: {
        groupId: input.groupId,
        userId: input.userId
      }
    },
    update: {
      role: input.role,
      status: "ACTIVE"
    },
    create: {
      groupId: input.groupId,
      userId: input.userId,
      role: input.role,
      status: "ACTIVE"
    },
    select: {
      id: true,
      role: true,
      status: true
    }
  });
}
