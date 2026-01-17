"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import {
  acceptInviteSchema,
  changeMemberRoleSchema,
  declineInviteSchema,
  inviteMemberSchema,
  removeMemberSchema
} from "@/lib/validation/members";
import { isAdminClergy, requireCoordinatorOrAdmin } from "@/lib/authz/membership";

export type MemberActionError =
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "ALREADY_MEMBER"
  | "VALIDATION_ERROR";

export type MemberActionState = {
  status: "success" | "error";
  message: string;
  error?: MemberActionError;
};

export const initialMemberActionState: MemberActionState = {
  status: "success",
  message: ""
};

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
  role?: "LEAD" | "MEMBER";
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

  const role = parsed.data.role ?? "MEMBER";

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
      invitedEmail: null
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

export async function changeMemberRole(input: {
  groupId: string;
  userId: string;
  role: "LEAD" | "MEMBER";
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

  if (!context.parishRole || (!isAdminClergy(context.parishRole) && context.groupRole !== "LEAD")) {
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
