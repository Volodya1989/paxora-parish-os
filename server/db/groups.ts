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

export async function isCoordinatorInParish(parishId: string, userId: string) {
  const membership = await prisma.groupMembership.findFirst({
    where: {
      userId,
      role: "COORDINATOR",
      status: "ACTIVE",
      group: {
        parishId
      }
    },
    select: {
      id: true
    }
  });

  return Boolean(membership);
}

export async function isCoordinatorForGroup(groupId: string, userId: string) {
  const membership = await getGroupMembership(groupId, userId);
  return membership?.status === "ACTIVE" && membership.role === "COORDINATOR";
}

export async function listGroupsByParish(parishId: string) {
  return prisma.group.findMany({
    where: { parishId, archivedAt: null, status: "ACTIVE" },
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
  role: "COORDINATOR" | "PARISHIONER";
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
