import { prisma } from "@/server/db/prisma";

type MembershipPolicy = {
  allowGroupLeads: boolean;
};

type GroupMembershipActionInput = {
  parishId: string;
  groupId: string;
  actorUserId: string;
  targetUserId: string;
  policy: MembershipPolicy;
};

async function canUpdateGroupMembership({
  parishId,
  groupId,
  actorUserId,
  policy
}: Omit<GroupMembershipActionInput, "targetUserId">) {
  const parishMembership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId: actorUserId
      }
    },
    select: { role: true }
  });

  if (!parishMembership) {
    return false;
  }

  if (parishMembership.role === "ADMIN" || parishMembership.role === "SHEPHERD") {
    return true;
  }

  if (!policy.allowGroupLeads) {
    return false;
  }

  const groupMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: actorUserId
      }
    },
    select: { role: true, status: true }
  });

  return groupMembership?.status === "ACTIVE" && groupMembership.role === "COORDINATOR";
}

export async function addGroupMember({
  parishId,
  groupId,
  actorUserId,
  targetUserId,
  policy
}: GroupMembershipActionInput) {
  const allowed = await canUpdateGroupMembership({
    parishId,
    groupId,
    actorUserId,
    policy
  });

  if (!allowed) {
    throw new Error("Forbidden");
  }

  return prisma.groupMembership.create({
    data: {
      groupId,
      userId: targetUserId,
      status: "ACTIVE"
    }
  });
}

export async function removeGroupMember({
  parishId,
  groupId,
  actorUserId,
  targetUserId,
  policy
}: GroupMembershipActionInput) {
  const allowed = await canUpdateGroupMembership({
    parishId,
    groupId,
    actorUserId,
    policy
  });

  if (!allowed) {
    throw new Error("Forbidden");
  }

  return prisma.groupMembership.delete({
    where: {
      groupId_userId: {
        groupId,
        userId: targetUserId
      }
    }
  });
}
