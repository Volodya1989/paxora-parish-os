"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import type { ParishRole } from "@prisma/client";
import { authOptions } from "@/server/auth/options";
import { resolveParishContext } from "@/server/auth/parish-context";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { removeMemberSchema, updateMemberRoleSchema } from "@/lib/validation/people";
import type { PeopleActionError, PeopleActionState } from "@/lib/types/people";

const leaderRoles: ParishRole[] = ["ADMIN", "SHEPHERD"];

function buildError(message: string, error: PeopleActionError): PeopleActionState {
  return { status: "error", message, error };
}

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parishContext = await resolveParishContext({
    userId: session.user.id,
    activeParishId: session.user.activeParishId
  });

  if (!parishContext.parishId) {
    throw new Error("Unauthorized");
  }

  await requireAdminOrShepherd(session.user.id, parishContext.parishId);
  return {
    userId: session.user.id,
    parishId: parishContext.parishId
  };
}

function isLeaderRole(role: ParishRole) {
  return role === "ADMIN" || role === "SHEPHERD";
}

async function ensureLeadershipRemains(parishId: string, role: ParishRole, nextRole: ParishRole) {
  if (!isLeaderRole(role) || isLeaderRole(nextRole)) {
    return;
  }

  const leaderCount = await prisma.membership.count({
    where: {
      parishId,
      role: {
        in: leaderRoles
      }
    }
  });

  if (leaderCount <= 1) {
    throw new Error("Parish must retain at least one admin or clergy member.");
  }
}

async function ensureLeadershipForRemoval(parishId: string, role: ParishRole) {
  if (!isLeaderRole(role)) {
    return;
  }

  const leaderCount = await prisma.membership.count({
    where: {
      parishId,
      role: {
        in: leaderRoles
      }
    }
  });

  if (leaderCount <= 1) {
    throw new Error("Parish must retain at least one admin or clergy member.");
  }
}

export async function updateMemberRole(input: {
  memberId: string;
  role: ParishRole;
}): Promise<PeopleActionState> {
  const parsed = updateMemberRoleSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid role.", "VALIDATION_ERROR");
  }

  let context;
  try {
    context = await requireAdminSession();
  } catch (error) {
    return buildError("You do not have permission to update roles.", "NOT_AUTHORIZED");
  }

  const membership = await prisma.membership.findUnique({
    where: { id: parsed.data.memberId },
    select: {
      id: true,
      parishId: true,
      role: true
    }
  });

  if (!membership || membership.parishId !== context.parishId) {
    return buildError("Member not found.", "NOT_FOUND");
  }

  if (membership.role === parsed.data.role) {
    return { status: "success", message: "Role already set." };
  }

  try {
    await ensureLeadershipRemains(context.parishId, membership.role, parsed.data.role);
  } catch (error) {
    return buildError(
      "At least one admin or clergy member is required.",
      "LEADERSHIP_REQUIRED"
    );
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { role: parsed.data.role }
  });

  revalidatePath("/admin/people");

  return { status: "success", message: "Role updated." };
}

export async function removeMember(input: { memberId: string }): Promise<PeopleActionState> {
  const parsed = removeMemberSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid member.", "VALIDATION_ERROR");
  }

  let context;
  try {
    context = await requireAdminSession();
  } catch (error) {
    return buildError("You do not have permission to remove members.", "NOT_AUTHORIZED");
  }

  const membership = await prisma.membership.findUnique({
    where: { id: parsed.data.memberId },
    select: {
      id: true,
      parishId: true,
      role: true
    }
  });

  if (!membership || membership.parishId !== context.parishId) {
    return buildError("Member not found.", "NOT_FOUND");
  }

  try {
    await ensureLeadershipForRemoval(context.parishId, membership.role);
  } catch (error) {
    return buildError(
      "At least one admin or clergy member is required.",
      "LEADERSHIP_REQUIRED"
    );
  }

  await prisma.membership.delete({
    where: { id: membership.id }
  });

  revalidatePath("/admin/people");

  return { status: "success", message: "Member removed." };
}
