"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import {
  acceptInviteSchema,
  changeMemberRoleSchema,
  declineInviteSchema,
  joinGroupSchema,
  requestToJoinSchema,
  leaveGroupSchema,
  approveRequestSchema,
  denyRequestSchema,
  inviteMemberSchema,
  removeMemberSchema,
  cancelInviteSchema
} from "@/lib/validation/members";
import { isAdminClergy, requireCoordinatorOrAdmin } from "@/lib/authz/membership";
import type { MemberActionError, MemberActionState } from "@/lib/types/members";

function buildError(message: string, error: MemberActionError): MemberActionState {
  return { status: "error", message, error };
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function inviteMember(input: {
  groupId: string;
  email: string;
  role?: "COORDINATOR" | "PARISHIONER";
}): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = inviteMemberSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid invite", "VALIDATION_ERROR");
  }

  let context;
  try {
    context = await requireCoordinatorOrAdmin(session.user.id, parsed.data.groupId);
  } catch (error) {
    return buildError("You do not have permission to invite members.", "NOT_AUTHORIZED");
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true }
  });

  if (!targetUser) {
    return buildError("No parishioner found with that email.", "NOT_FOUND");
  }

  const parishMembership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: context.parishId,
        userId: targetUser.id
      }
    },
    select: { id: true }
  });

  if (!parishMembership) {
    return buildError("That person is not yet approved in the parish.", "NOT_FOUND");
  }

  const existing = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: targetUser.id
      }
    },
    select: { status: true }
  });

  if (existing?.status === "ACTIVE") {
    return buildError("That parishioner is already in this group.", "ALREADY_MEMBER");
  }
  if (existing?.status === "INVITED" || existing?.status === "REQUESTED") {
    return buildError("That parishioner already has a pending invite or request.", "ALREADY_PENDING");
  }

  const role = parsed.data.role ?? "PARISHIONER";

  await prisma.groupMembership.upsert({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: targetUser.id
      }
    },
    update: {
      role,
      status: "INVITED",
      invitedByUserId: session.user.id,
      invitedEmail: targetUser.email
    },
    create: {
      groupId: parsed.data.groupId,
      userId: targetUser.id,
      role,
      status: "INVITED",
      invitedByUserId: session.user.id,
      invitedEmail: targetUser.email
    }
  });

  revalidatePath(`/groups/${parsed.data.groupId}/members`);
  revalidatePath(`/groups/${parsed.data.groupId}`);

  return {
    status: "success",
    message: "Invite sent."
  };
}

export async function acceptInvite(input: { groupId: string }): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = acceptInviteSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid invite", "VALIDATION_ERROR");
  }

  const membership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: session.user.id
      }
    },
    select: { status: true }
  });

  if (!membership || membership.status !== "INVITED") {
    return buildError("Invite not found.", "NOT_FOUND");
  }

  await prisma.groupMembership.update({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: session.user.id
      }
    },
    data: {
      status: "ACTIVE",
      invitedByUserId: null,
      invitedEmail: null,
      approvedByUserId: session.user.id
    }
  });

  revalidatePath(`/groups/${parsed.data.groupId}/members`);
  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath("/groups");

  return {
    status: "success",
    message: "Welcome to the group."
  };
}

export async function declineInvite(input: { groupId: string }): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = declineInviteSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid invite", "VALIDATION_ERROR");
  }

  const membership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: session.user.id
      }
    },
    select: { status: true }
  });

  if (!membership || membership.status !== "INVITED") {
    return buildError("Invite not found.", "NOT_FOUND");
  }

  await prisma.groupMembership.delete({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: session.user.id
      }
    }
  });

  revalidatePath("/groups");

  return {
    status: "success",
    message: "Invite declined."
  };
}

export async function joinGroup(input: { groupId: string }): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = joinGroupSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid group", "VALIDATION_ERROR");
  }

  const group = await prisma.group.findUnique({
    where: { id: parsed.data.groupId },
    select: { id: true, parishId: true, joinPolicy: true, status: true }
  });

  if (!group) {
    return buildError("Group not found.", "NOT_FOUND");
  }

  if (group.status !== "ACTIVE") {
    return buildError("This group is not available to join yet.", "NOT_AUTHORIZED");
  }

  const parishMembership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: group.parishId,
        userId: session.user.id
      }
    },
    select: { role: true }
  });

  if (!parishMembership) {
    return buildError("You are not approved in this parish.", "NOT_AUTHORIZED");
  }

  if (group.joinPolicy !== "OPEN") {
    return buildError("This group is not open for instant joins.", "INVALID_POLICY");
  }

  const existing = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: session.user.id
      }
    },
    select: { status: true, role: true }
  });

  if (existing?.status === "ACTIVE") {
    return buildError("You are already a member of this group.", "ALREADY_MEMBER");
  }

  await prisma.groupMembership.upsert({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: session.user.id
      }
    },
    update: {
      status: "ACTIVE",
      invitedByUserId: null,
      invitedEmail: null,
      approvedByUserId: session.user.id
    },
    create: {
      groupId: group.id,
      userId: session.user.id,
      role: existing?.role ?? "PARISHIONER",
      status: "ACTIVE",
      approvedByUserId: session.user.id
    }
  });

  revalidatePath(`/groups/${group.id}`);
  revalidatePath(`/groups/${group.id}/members`);
  revalidatePath("/groups");

  return {
    status: "success",
    message: "You joined the group."
  };
}

export async function requestToJoin(input: { groupId: string }): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = requestToJoinSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid group", "VALIDATION_ERROR");
  }

  const group = await prisma.group.findUnique({
    where: { id: parsed.data.groupId },
    select: { id: true, parishId: true, joinPolicy: true, status: true }
  });

  if (!group) {
    return buildError("Group not found.", "NOT_FOUND");
  }

  if (group.status !== "ACTIVE") {
    return buildError("This group is not available to join yet.", "NOT_AUTHORIZED");
  }

  const parishMembership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: group.parishId,
        userId: session.user.id
      }
    },
    select: { role: true }
  });

  if (!parishMembership) {
    return buildError("You are not approved in this parish.", "NOT_AUTHORIZED");
  }

  if (group.joinPolicy !== "REQUEST_TO_JOIN") {
    return buildError("This group does not accept join requests.", "INVALID_POLICY");
  }

  const existing = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: session.user.id
      }
    },
    select: { status: true, role: true }
  });

  if (existing?.status === "ACTIVE") {
    return buildError("You are already a member of this group.", "ALREADY_MEMBER");
  }
  if (existing?.status === "REQUESTED" || existing?.status === "INVITED") {
    return buildError("Your request or invite is already pending.", "ALREADY_PENDING");
  }

  await prisma.groupMembership.create({
    data: {
      groupId: group.id,
      userId: session.user.id,
      role: "PARISHIONER",
      status: "REQUESTED"
    }
  });

  revalidatePath(`/groups/${group.id}`);
  revalidatePath(`/groups/${group.id}/members`);
  revalidatePath("/groups");

  return {
    status: "success",
    message: "Request sent."
  };
}

export async function leaveGroup(input: { groupId: string }): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = leaveGroupSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid group", "VALIDATION_ERROR");
  }

  const membership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: session.user.id
      }
    },
    select: { status: true }
  });

  if (!membership || membership.status !== "ACTIVE") {
    return buildError("You are not an active member of this group.", "NOT_FOUND");
  }

  await prisma.groupMembership.delete({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: session.user.id
      }
    }
  });

  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath(`/groups/${parsed.data.groupId}/members`);
  revalidatePath("/groups");

  return {
    status: "success",
    message: "You have left the group."
  };
}

export async function approveJoinRequest(input: {
  groupId: string;
  userId: string;
}): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = approveRequestSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid request", "VALIDATION_ERROR");
  }

  let context;
  try {
    context = await requireCoordinatorOrAdmin(session.user.id, parsed.data.groupId);
  } catch (error) {
    return buildError("You do not have permission to approve requests.", "NOT_AUTHORIZED");
  }

  const target = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: parsed.data.userId
      }
    },
    select: { status: true }
  });

  if (!target || target.status !== "REQUESTED") {
    return buildError("Join request not found.", "NOT_FOUND");
  }

  await prisma.groupMembership.update({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: parsed.data.userId
      }
    },
    data: {
      status: "ACTIVE",
      approvedByUserId: session.user.id
    }
  });

  revalidatePath(`/groups/${parsed.data.groupId}/members`);
  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath("/groups");

  return {
    status: "success",
    message: "Request approved."
  };
}

export async function denyJoinRequest(input: {
  groupId: string;
  userId: string;
}): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = denyRequestSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid request", "VALIDATION_ERROR");
  }

  try {
    await requireCoordinatorOrAdmin(session.user.id, parsed.data.groupId);
  } catch (error) {
    return buildError("You do not have permission to deny requests.", "NOT_AUTHORIZED");
  }

  const target = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: parsed.data.userId
      }
    },
    select: { status: true }
  });

  if (!target || target.status !== "REQUESTED") {
    return buildError("Join request not found.", "NOT_FOUND");
  }

  await prisma.groupMembership.delete({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: parsed.data.userId
      }
    }
  });

  revalidatePath(`/groups/${parsed.data.groupId}/members`);
  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath("/groups");

  return {
    status: "success",
    message: "Request denied."
  };
}

export async function removeMember(input: {
  groupId: string;
  userId: string;
}): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = removeMemberSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid member", "VALIDATION_ERROR");
  }

  try {
    await requireCoordinatorOrAdmin(session.user.id, parsed.data.groupId);
  } catch (error) {
    return buildError("You do not have permission to remove members.", "NOT_AUTHORIZED");
  }

  const target = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: parsed.data.userId
      }
    },
    select: { id: true }
  });

  if (!target) {
    return buildError("Member not found.", "NOT_FOUND");
  }

  await prisma.groupMembership.delete({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: parsed.data.userId
      }
    }
  });

  revalidatePath(`/groups/${parsed.data.groupId}/members`);
  revalidatePath(`/groups/${parsed.data.groupId}`);

  return {
    status: "success",
    message: "Member removed."
  };
}

export async function cancelInvite(input: {
  groupId: string;
  userId: string;
}): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = cancelInviteSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid invite", "VALIDATION_ERROR");
  }

  try {
    await requireCoordinatorOrAdmin(session.user.id, parsed.data.groupId);
  } catch (error) {
    return buildError("You do not have permission to cancel invites.", "NOT_AUTHORIZED");
  }

  const target = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: parsed.data.userId
      }
    },
    select: { status: true }
  });

  if (!target || target.status !== "INVITED") {
    return buildError("Invite not found.", "NOT_FOUND");
  }

  await prisma.groupMembership.delete({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: parsed.data.userId
      }
    }
  });

  revalidatePath(`/groups/${parsed.data.groupId}/members`);
  revalidatePath(`/groups/${parsed.data.groupId}`);

  return {
    status: "success",
    message: "Invite cancelled."
  };
}

export async function changeMemberRole(input: {
  groupId: string;
  userId: string;
  role: "COORDINATOR" | "PARISHIONER";
}): Promise<MemberActionState> {
  const session = await requireSession();
  const parsed = changeMemberRoleSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid role", "VALIDATION_ERROR");
  }

  let context;
  try {
    context = await requireCoordinatorOrAdmin(session.user.id, parsed.data.groupId);
  } catch (error) {
    return buildError("You do not have permission to change roles.", "NOT_AUTHORIZED");
  }

  if (
    !context.parishRole ||
    (!isAdminClergy(context.parishRole) && context.groupRole !== "COORDINATOR")
  ) {
    return buildError("You do not have permission to change roles.", "NOT_AUTHORIZED");
  }

  const target = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: parsed.data.userId
      }
    },
    select: { status: true }
  });

  if (!target || target.status !== "ACTIVE") {
    return buildError("Member not found.", "NOT_FOUND");
  }

  await prisma.groupMembership.update({
    where: {
      groupId_userId: {
        groupId: parsed.data.groupId,
        userId: parsed.data.userId
      }
    },
    data: {
      role: parsed.data.role,
      status: "ACTIVE"
    }
  });

  revalidatePath(`/groups/${parsed.data.groupId}/members`);

  return {
    status: "success",
    message: "Role updated."
  };
}
