"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import {
  createGroupSchema,
  getGroupDetailSchema,
  groupArchiveSchema,
  updateGroupMembershipSchema
} from "@/lib/validation/groups";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";

// TODO: Wire to parish policy once stored in the database.
const ALLOW_GROUP_LEADS_TO_MANAGE_MEMBERSHIP = true;

function assertSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  return { userId: session.user.id, parishId: session.user.activeParishId };
}

async function requireParishMembership(userId: string, parishId: string) {
  const membership = await getParishMembership(parishId, userId);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  return membership;
}

async function requireParishLeader(userId: string, parishId: string) {
  const membership = await requireParishMembership(userId, parishId);

  if (!isParishLeader(membership.role)) {
    throw new Error("Forbidden");
  }

  return membership;
}

function assertActorContext(
  session: Session | null,
  input: { parishId: string; actorUserId: string }
) {
  const { userId, parishId } = assertSession(session);

  if (userId !== input.actorUserId || parishId !== input.parishId) {
    throw new Error("Unauthorized");
  }

  return { userId, parishId };
}

export async function listGroups() {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await requireParishMembership(userId, parishId);

  return prisma.group.findMany({
    where: { parishId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true
    }
  });
}

export async function createGroup(input: {
  parishId: string;
  actorUserId: string;
  name: string;
  description?: string | null;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertActorContext(session, input);

  await requireParishLeader(userId, parishId);

  const parsed = createGroupSchema.safeParse({
    name: input.name,
    description: input.description ?? undefined
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const group = await prisma.group.create({
    data: {
      parishId,
      name: parsed.data.name,
      description: parsed.data.description?.trim() || undefined
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      archivedAt: true
    }
  } as any);

  revalidatePath("/groups");

  return group;
}

export async function archiveGroup(input: {
  parishId: string;
  actorUserId: string;
  groupId: string;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertActorContext(session, input);

  const parsed = groupArchiveSchema.safeParse({ groupId: input.groupId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await requireParishLeader(userId, parishId);

  const result = await prisma.group.updateMany({
    where: {
      id: parsed.data.groupId,
      parishId
    },
    data: {
      archivedAt: new Date()
    }
  } as any);

  if (result.count === 0) {
    throw new Error("Not found");
  }

  revalidatePath("/groups");
}

export async function restoreGroup(input: {
  parishId: string;
  actorUserId: string;
  groupId: string;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertActorContext(session, input);

  const parsed = groupArchiveSchema.safeParse({ groupId: input.groupId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await requireParishLeader(userId, parishId);

  const result = await prisma.group.updateMany({
    where: {
      id: parsed.data.groupId,
      parishId
    },
    data: {
      archivedAt: null
    }
  } as any);

  if (result.count === 0) {
    throw new Error("Not found");
  }

  revalidatePath("/groups");
}

export async function getGroupDetail(groupId: string) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = getGroupDetailSchema.safeParse({ groupId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await requireParishMembership(userId, parishId);

  const group = await prisma.group.findFirst({
    where: { id: parsed.data.groupId, parishId },
    select: {
      id: true,
      name: true,
      description: true
    }
  });

  if (!group) {
    throw new Error("Not found");
  }

  const week = await getOrCreateCurrentWeek(parishId);

  const [memberships, tasks] = await Promise.all([
    prisma.groupMembership.findMany({
      where: { groupId: group.id },
      orderBy: { user: { name: "asc" } },
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
        groupId: group.id,
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
    group,
    members: memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role
    })),
    tasks
  };
}

export async function updateGroupMembership(formData: FormData) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = updateGroupMembershipSchema.safeParse({
    groupId: formData.get("groupId"),
    userId: formData.get("userId"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const group = await prisma.group.findFirst({
    where: { id: parsed.data.groupId, parishId },
    select: { id: true }
  });

  if (!group) {
    throw new Error("Not found");
  }

  const actorMembership = await requireParishMembership(userId, parishId);
  const isLeader = isParishLeader(actorMembership.role);

  if (!isLeader) {
    if (!ALLOW_GROUP_LEADS_TO_MANAGE_MEMBERSHIP) {
      throw new Error("Forbidden");
    }

    const groupMembership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId
        }
      }
    });

    if (groupMembership?.role !== "LEAD") {
      throw new Error("Forbidden");
    }
  }

  const targetParishMember = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId: parsed.data.userId
      }
    },
    select: { id: true }
  });

  if (!targetParishMember) {
    throw new Error("Not found");
  }

  if (parsed.data.role === "REMOVE") {
    await prisma.groupMembership.deleteMany({
      where: {
        groupId: group.id,
        userId: parsed.data.userId
      }
    });

    return { success: true };
  }

  await prisma.groupMembership.upsert({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: parsed.data.userId
      }
    },
    update: {
      role: parsed.data.role
    },
    create: {
      groupId: group.id,
      userId: parsed.data.userId,
      role: parsed.data.role
    }
  });

  return { success: true };
  
}

const groupActions = {
  listGroups,
  createGroup,
  archiveGroup,
  restoreGroup,
  getGroupDetail,
  updateGroupMembership
} as const;

export default groupActions;

