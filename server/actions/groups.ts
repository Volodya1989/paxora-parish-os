"use server";

import { getServerSession, type Session } from "next-auth";
import { Prisma, TaskApprovalStatus, TaskVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import {
  createGroupSchema,
  getGroupDetailSchema,
  groupArchiveSchema,
  groupDeleteSchema,
  updateGroupSchema,
  updateGroupMembershipSchema
} from "@/lib/validation/groups";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { notifyContentRequestDecisionInApp, notifyContentRequestSubmittedInApp } from "@/lib/notifications/notify";

// TODO: Wire to parish policy once stored in the database.
const ALLOW_GROUP_LEADS_TO_MANAGE_MEMBERSHIP = true;

type GroupCreateResult = {
  status: "success" | "error";
  message?: string;
};

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

  const parishMembership = await requireParishMembership(userId, parishId);

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

async function createGroupInternal(input: {
  parishId: string;
  actorUserId: string;
  name: string;
  description?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  joinPolicy: "INVITE_ONLY" | "OPEN" | "REQUEST_TO_JOIN";
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertActorContext(session, input);

  const membership = await requireParishMembership(userId, parishId);
  const isLeader = isParishLeader(membership.role);

  const parsed = createGroupSchema.safeParse({
    name: input.name,
    description: input.description ?? undefined,
    visibility: input.visibility,
    joinPolicy: input.joinPolicy
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const group = await prisma
    .$transaction(async (tx) => {
      if (!isLeader) {
        const pendingRequest = await tx.group.findFirst({
          where: { parishId, createdById: userId, status: "PENDING_APPROVAL" },
          select: { id: true }
        });

        if (pendingRequest) {
          throw new Error("You already have a pending group request. Please wait for review or cancel the pending request.");
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const requestCount = await tx.group.count({
          where: {
            parishId,
            createdById: userId,
            createdAt: {
              gte: monthStart
            }
          }
        });

        if (requestCount >= 2) {
          throw new Error("You can request up to two groups per month.");
        }
      }

      const status = isLeader ? "ACTIVE" : "PENDING_APPROVAL";
      const createdGroup = await tx.group.create({
        data: {
          parishId,
          createdById: userId,
          name: parsed.data.name,
          description: parsed.data.description?.trim() || undefined,
          visibility: parsed.data.visibility,
          joinPolicy: parsed.data.joinPolicy,
          status
        },
        select: {
          id: true,
          name: true,
          description: true,
          visibility: true,
          joinPolicy: true,
          createdAt: true,
          archivedAt: true,
          status: true
        }
      } as any);

      if (isLeader) {
        await tx.groupMembership.create({
          data: {
            groupId: createdGroup.id,
            userId,
            role: "COORDINATOR",
            status: "ACTIVE",
            approvedByUserId: userId
          }
        });
      }

      return createdGroup;
    })
    .catch((error: unknown) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new Error("A group with this name already exists. Please use a unique name.");
      }
      throw error;
    });

  revalidatePath("/groups");

  return group;
}


export async function createGroup(input: {
  parishId: string;
  actorUserId: string;
  name: string;
  description?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  joinPolicy: "INVITE_ONLY" | "OPEN" | "REQUEST_TO_JOIN";
}) {
  return createGroupInternal(input);
}

export async function submitGroupCreationRequest(input: {
  parishId: string;
  actorUserId: string;
  name: string;
  description?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  joinPolicy: "INVITE_ONLY" | "OPEN" | "REQUEST_TO_JOIN";
}): Promise<GroupCreateResult> {
  try {
    const created = await createGroupInternal(input);

    if (created.status === "PENDING_APPROVAL") {
      await notifyContentRequestSubmittedInApp({
        parishId: input.parishId,
        requesterId: input.actorUserId,
        title: created.name,
        href: "/groups?pending=1"
      });
    }

    return { status: "success" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit group request.";
    return { status: "error", message };
  }
}

export async function approveGroupRequest(input: {
  parishId: string;
  actorUserId: string;
  groupId: string;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertActorContext(session, input);

  await requireParishLeader(userId, parishId);

  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
    select: { parishId: true, status: true, createdById: true }
  });

  if (!group || group.parishId !== parishId) {
    throw new Error("Group not found");
  }

  if (group.status !== "PENDING_APPROVAL") {
    throw new Error("Group is not pending approval.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.group.update({
      where: { id: input.groupId },
      data: { status: "ACTIVE" }
    });

    await tx.groupMembership.upsert({
      where: {
        groupId_userId: {
          groupId: input.groupId,
          userId: group.createdById
        }
      },
      update: {
        role: "COORDINATOR",
        status: "ACTIVE",
        approvedByUserId: userId
      },
      create: {
        groupId: input.groupId,
        userId: group.createdById,
        role: "COORDINATOR",
        status: "ACTIVE",
        approvedByUserId: userId
      }
    });
  });

  await notifyContentRequestDecisionInApp({
    parishId,
    requesterId: group.createdById,
    title: "Group request",
    decision: "APPROVED",
    href: `/groups?pending=1&groupId=${input.groupId}`
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${input.groupId}`);
}

export async function rejectGroupRequest(input: {
  parishId: string;
  actorUserId: string;
  groupId: string;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertActorContext(session, input);

  await requireParishLeader(userId, parishId);

  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
    select: { parishId: true, status: true, createdById: true }
  });

  if (!group || group.parishId !== parishId) {
    throw new Error("Group not found");
  }

  if (group.status !== "PENDING_APPROVAL") {
    throw new Error("Group is not pending approval.");
  }

  await prisma.group.update({
    where: { id: input.groupId },
    data: { status: "REJECTED" }
  });

  await notifyContentRequestDecisionInApp({
    parishId,
    requesterId: group.createdById,
    title: "Group request",
    decision: "DECLINED",
    href: "/groups?pending=1"
  });

  revalidatePath("/groups");
}

export async function updateGroup(input: {
  parishId: string;
  actorUserId: string;
  groupId: string;
  name: string;
  description?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  joinPolicy: "INVITE_ONLY" | "OPEN" | "REQUEST_TO_JOIN";
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertActorContext(session, input);

  await requireParishLeader(userId, parishId);

  const parsed = updateGroupSchema.safeParse({
    groupId: input.groupId,
    name: input.name,
    description: input.description ?? undefined,
    visibility: input.visibility,
    joinPolicy: input.joinPolicy
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const result = await prisma.group.updateMany({
    where: {
      id: parsed.data.groupId,
      parishId
    },
    data: {
      name: parsed.data.name,
      description: parsed.data.description?.trim() || undefined,
      visibility: parsed.data.visibility,
      joinPolicy: parsed.data.joinPolicy
    }
  } as any);

  if (result.count === 0) {
    throw new Error("Not found");
  }

  revalidatePath("/groups");
  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath(`/groups/${parsed.data.groupId}/members`);
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

export async function deleteGroup(input: {
  parishId: string;
  actorUserId: string;
  groupId: string;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertActorContext(session, input);

  const parsed = groupDeleteSchema.safeParse({ groupId: input.groupId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await requireParishLeader(userId, parishId);

  const group = await prisma.group.findFirst({
    where: { id: parsed.data.groupId, parishId },
    select: { id: true, archivedAt: true }
  });

  if (!group) {
    throw new Error("Not found");
  }

  if (!group.archivedAt) {
    throw new Error("Only archived groups can be deleted.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.groupMembership.deleteMany({ where: { groupId: group.id } });
    await tx.task.updateMany({ where: { groupId: group.id }, data: { groupId: null } });
    await tx.event.updateMany({ where: { groupId: group.id }, data: { groupId: null } });
    await tx.hoursEntry.updateMany({ where: { groupId: group.id }, data: { groupId: null } });
    await tx.group.delete({ where: { id: group.id } });
  });

  revalidatePath("/groups");
}

export async function getGroupDetail(groupId: string) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = getGroupDetailSchema.safeParse({ groupId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const parishMembership = await requireParishMembership(userId, parishId);

  const group = await prisma.group.findFirst({
    where: { id: parsed.data.groupId, parishId },
    select: {
      id: true,
      name: true,
      description: true,
      visibility: true,
      joinPolicy: true
    }
  });

  if (!group) {
    throw new Error("Not found");
  }

  const [groupMembership, week] = await Promise.all([
    prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId
        }
      },
      select: { status: true }
    }),
    getOrCreateCurrentWeek(parishId)
  ]);

  if (!isParishLeader(parishMembership.role)) {
    const canView =
      group.visibility === "PUBLIC" || groupMembership?.status === "ACTIVE";
    if (!canView) {
      throw new Error("Unauthorized");
    }
  }
  const visibilityWhere: Prisma.TaskWhereInput = {
    OR: [
      { visibility: TaskVisibility.PUBLIC, approvalStatus: TaskApprovalStatus.APPROVED },
      { ownerId: userId },
      { createdById: userId }
    ]
  };

  const [memberships, tasks] = await Promise.all([
    prisma.groupMembership.findMany({
      where: { groupId: group.id, status: "ACTIVE" },
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
        weekId: week.id,
        archivedAt: null,
        AND: [visibilityWhere]
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

    if (groupMembership?.status !== "ACTIVE" || groupMembership.role !== "COORDINATOR") {
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
      role: parsed.data.role,
      status: "ACTIVE"
    },
    create: {
      groupId: group.id,
      userId: parsed.data.userId,
      role: parsed.data.role,
      status: "ACTIVE"
    }
  });

  return { success: true };
  
}
