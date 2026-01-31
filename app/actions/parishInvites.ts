"use server";

import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { normalizeEmail } from "@/lib/validation/auth";
import {
  acceptParishInviteSchema,
  createParishInviteSchema,
  revokeParishInviteSchema
} from "@/lib/validation/parishInvites";
import { sendParishInviteEmail } from "@/lib/email/parishInvites";
import { getAppUrl } from "@/lib/email/utils";
import type { Prisma } from "@prisma/client";
import type { ParishInviteActionError, ParishInviteActionState } from "@/lib/types/parishInvites";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function buildError(message: string, error: ParishInviteActionError): ParishInviteActionState {
  return { status: "error", message, error };
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function requireAdminSession(parishId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  if (session.user.activeParishId !== parishId) {
    throw new Error("Unauthorized");
  }

  await requireAdminOrShepherd(session.user.id, session.user.activeParishId);

  return {
    userId: session.user.id,
    parishId: session.user.activeParishId
  };
}

export async function createParishInvite(input: {
  parishId: string;
  email: string;
  role?: "ADMIN" | "SHEPHERD" | "MEMBER";
}): Promise<ParishInviteActionState> {
  const parsed = createParishInviteSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid invite.", "VALIDATION_ERROR");
  }

  let context;
  try {
    context = await requireAdminSession(parsed.data.parishId);
  } catch (error) {
    return buildError("You do not have permission to invite members.", "NOT_AUTHORIZED");
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);

  const [parish, user] = await Promise.all([
    prisma.parish.findUnique({
      where: { id: context.parishId },
      select: { id: true, name: true }
    }),
    prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true }
    })
  ]);

  if (!parish) {
    return buildError("Parish not found.", "NOT_FOUND");
  }

  if (user) {
    const membership = await prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId: context.parishId,
          userId: user.id
        }
      },
      select: { id: true }
    });

    if (membership) {
      return buildError("That parishioner already has access.", "ALREADY_MEMBER");
    }
  }

  const existingInvite = await prisma.parishInvite.findFirst({
    where: {
      parishId: context.parishId,
      email: normalizedEmail,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    select: { id: true }
  });

  if (existingInvite) {
    return buildError("That email already has a pending invite.", "ALREADY_PENDING");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const role = parsed.data.role ?? "MEMBER";

  await prisma.parishInvite.create({
    data: {
      parishId: context.parishId,
      email: normalizedEmail,
      role,
      tokenHash,
      expiresAt,
      invitedByUserId: context.userId
    },
    select: { id: true }
  });

  const inviteUrl = `${getAppUrl()}/invite/parish?token=${encodeURIComponent(token)}`;

  try {
    await sendParishInviteEmail({
      parishId: context.parishId,
      parishName: parish.name,
      inviteeEmail: normalizedEmail,
      inviteLink: inviteUrl,
      invitedByUserId: context.userId
    });
  } catch (error) {
    console.error("Failed to send parish invite email", error);
  }

  revalidatePath("/admin/people");

  return {
    status: "success",
    message: "Invite sent."
  };
}

export async function revokeParishInvite(input: {
  inviteId: string;
}): Promise<ParishInviteActionState> {
  const parsed = revokeParishInviteSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid invite.", "VALIDATION_ERROR");
  }

  let context;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.activeParishId) {
      throw new Error("Unauthorized");
    }
    context = {
      userId: session.user.id,
      parishId: session.user.activeParishId
    };
  } catch (error) {
    return buildError("You do not have permission to revoke invites.", "NOT_AUTHORIZED");
  }

  const invite = await prisma.parishInvite.findUnique({
    where: { id: parsed.data.inviteId },
    select: { id: true, parishId: true, acceptedAt: true, revokedAt: true }
  });

  if (!invite || invite.parishId !== context.parishId) {
    return buildError("Invite not found.", "NOT_FOUND");
  }

  try {
    await requireAdminOrShepherd(context.userId, context.parishId);
  } catch (error) {
    return buildError("You do not have permission to revoke invites.", "NOT_AUTHORIZED");
  }

  if (invite.acceptedAt) {
    return buildError("That invite has already been accepted.", "NOT_FOUND");
  }

  if (invite.revokedAt) {
    return { status: "success", message: "Invite revoked." };
  }

  await prisma.parishInvite.update({
    where: { id: invite.id },
    data: { revokedAt: new Date() }
  });

  revalidatePath("/admin/people");

  return {
    status: "success",
    message: "Invite revoked."
  };
}

export async function acceptParishInvite(input: { token: string }): Promise<ParishInviteActionState> {
  const parsed = acceptParishInviteSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid invite.", "VALIDATION_ERROR");
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return buildError("You need to sign in to accept this invite.", "NOT_AUTHORIZED");
  }

  const tokenHash = hashToken(parsed.data.token);
  const invite = await prisma.parishInvite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      parishId: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true
    }
  });

  if (!invite) {
    return buildError("This invite link is invalid.", "INVALID_TOKEN");
  }

  if (invite.revokedAt) {
    return buildError("This invite has been revoked.", "REVOKED");
  }

  if (invite.expiresAt < new Date()) {
    return buildError("This invite link has expired.", "EXPIRED");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, activeParishId: true }
  });

  if (!user) {
    return buildError("You need to sign in to accept this invite.", "NOT_AUTHORIZED");
  }

  if (normalizeEmail(user.email) !== invite.email) {
    return buildError("This invite was sent to a different email address.", "EMAIL_MISMATCH");
  }

  const existingMembership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: invite.parishId,
        userId: user.id
      }
    },
    select: { id: true }
  });

  if (invite.acceptedAt) {
    if (!user.activeParishId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { activeParishId: invite.parishId }
      });
    }
    return {
      status: "success",
      message: "Invite already accepted."
    };
  }

  const updates: Prisma.PrismaPromise<unknown>[] = [
    prisma.parishInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() }
    })
  ];

  if (!existingMembership) {
    updates.push(
      prisma.membership.create({
        data: {
          parishId: invite.parishId,
          userId: user.id,
          role: invite.role
        }
      })
    );
  }

  if (!user.activeParishId) {
    updates.push(
      prisma.user.update({
        where: { id: user.id },
        data: { activeParishId: invite.parishId }
      })
    );
  }

  await prisma.$transaction(updates);

  revalidatePath("/access");
  revalidatePath("/this-week");

  return {
    status: "success",
    message: "Invite accepted."
  };
}
