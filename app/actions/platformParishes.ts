"use server";

import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { requirePlatformAdmin } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import {
  platformParishSchema,
  updatePlatformParishSchema
} from "@/lib/validation/platformParishes";
import type {
  PlatformParishActionError,
  PlatformParishActionState
} from "@/lib/types/platformParishes";
import { createDefaultParishHubItems } from "@/server/db/parish-hub";
import { Prisma } from "@prisma/client";
import { createParishInviteCode } from "@/lib/parish/inviteCode";
import { z } from "zod";

function buildError(message: string, error: PlatformParishActionError): PlatformParishActionState {
  return { status: "error", message, error };
}

async function requirePlatformSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  await requirePlatformAdmin(session.user.id);
  return session.user.id;
}

async function safeDeleteParish(parishId: string) {
  return prisma.$transaction(async (tx) => {
    const parish = await tx.parish.findUnique({
      where: { id: parishId },
      select: {
        id: true,
        name: true,
        deactivatedAt: true
      }
    });

    if (!parish || !parish.deactivatedAt) {
      return { result: "not_deactivated" as const };
    }

    const cleanupCounts = {
      usersImpersonationCleared: 0,
      usersActiveParishCleared: 0,
      notificationsDeleted: 0,
      mentionsDeleted: 0,
      pushSubscriptionsDeleted: 0,
      accessRequestsDeleted: 0,
      parishInvitesDeleted: 0,
      deliveryAttemptsDeleted: 0,
      auditLogsDeleted: 0,
      contentReportsDeleted: 0,
      requestsDeleted: 0,
      announcementsDeleted: 0,
      digestsDeleted: 0,
      eventRequestsDeleted: 0,
      weeksDeleted: 0,
      groupMembershipsDeleted: 0,
      groupsDeleted: 0,
      membershipsDeleted: 0
    };

    cleanupCounts.usersImpersonationCleared = (
      await tx.user.updateMany({
        where: { impersonatedParishId: parish.id },
        data: { impersonatedParishId: null }
      })
    ).count;
    cleanupCounts.usersActiveParishCleared = (
      await tx.user.updateMany({
        where: { activeParishId: parish.id },
        data: { activeParishId: null }
      })
    ).count;
    cleanupCounts.notificationsDeleted = (await tx.notification.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.mentionsDeleted = (await tx.mention.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.pushSubscriptionsDeleted = (
      await tx.pushSubscription.deleteMany({ where: { parishId: parish.id } })
    ).count;
    cleanupCounts.accessRequestsDeleted = (await tx.accessRequest.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.parishInvitesDeleted = (await tx.parishInvite.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.deliveryAttemptsDeleted = (
      await tx.deliveryAttempt.deleteMany({ where: { parishId: parish.id } })
    ).count;
    cleanupCounts.auditLogsDeleted = (await tx.auditLog.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.contentReportsDeleted = (await tx.contentReport.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.requestsDeleted = (await tx.request.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.announcementsDeleted = (await tx.announcement.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.digestsDeleted = (await tx.digest.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.eventRequestsDeleted = (await tx.eventRequest.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.weeksDeleted = (await tx.week.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.groupMembershipsDeleted = (
      await tx.groupMembership.deleteMany({
        where: {
          group: {
            parishId: parish.id
          }
        }
      })
    ).count;
    cleanupCounts.groupsDeleted = (await tx.group.deleteMany({ where: { parishId: parish.id } })).count;
    cleanupCounts.membershipsDeleted = (await tx.membership.deleteMany({ where: { parishId: parish.id } })).count;

    await tx.parish.delete({ where: { id: parish.id } });

    return {
      result: "deleted" as const,
      name: parish.name,
      cleanupCounts
    };
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function ensureUniqueSlug(base: string) {
  const safeBase = base || `parish-${randomUUID().slice(0, 8)}`;
  let slug = safeBase;
  let counter = 0;
  while (await prisma.parish.findUnique({ where: { slug }, select: { id: true } })) {
    counter += 1;
    slug = `${safeBase}-${counter}`;
  }
  return slug;
}

function normalizeOptional(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : null;
}

const platformParishIdSchema = z.object({
  parishId: z.string().trim().min(1, "Parish is required.")
});

export async function createPlatformParish(input: {
  name: string;
  address?: string;
  timezone: string;
  logoUrl?: string;
  defaultLocale: string;
}): Promise<PlatformParishActionState> {
  try {
    await requirePlatformSession();
  } catch (error) {
    return buildError("You do not have permission to create parishes.", "NOT_AUTHORIZED");
  }

  const parsed = platformParishSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid input.", "VALIDATION_ERROR");
  }

  const baseSlug = slugify(parsed.data.name);
  const slug = await ensureUniqueSlug(baseSlug);
  let createdInviteCode: string | undefined;

  try {
    const inviteCode = await createParishInviteCode();
    const parish = await prisma.parish.create({
      data: {
        name: parsed.data.name.trim(),
        slug,
        inviteCode,
        inviteCodeCreatedAt: new Date(),
        address: normalizeOptional(parsed.data.address),
        timezone: parsed.data.timezone.trim(),
        logoUrl: normalizeOptional(parsed.data.logoUrl),
        defaultLocale: parsed.data.defaultLocale
      }
    });
    createdInviteCode = parish.inviteCode ?? undefined;

    await createDefaultParishHubItems(parish.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Slug collision from race condition – retry with a UUID suffix
      const retrySlug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
      const parish = await prisma.parish.create({
        data: {
          name: parsed.data.name.trim(),
          slug: retrySlug,
          inviteCode: await createParishInviteCode(),
          inviteCodeCreatedAt: new Date(),
          address: normalizeOptional(parsed.data.address),
          timezone: parsed.data.timezone.trim(),
          logoUrl: normalizeOptional(parsed.data.logoUrl),
          defaultLocale: parsed.data.defaultLocale
        }
      });
      createdInviteCode = parish.inviteCode ?? undefined;
      await createDefaultParishHubItems(parish.id);
      revalidatePath("/platform/parishes");
      return { status: "success", message: "Parish created.", inviteCode: createdInviteCode };
    } else {
      throw error;
    }
  }

  revalidatePath("/platform/parishes");

  return { status: "success", message: "Parish created.", inviteCode: createdInviteCode };
}

export async function updatePlatformParish(input: {
  parishId: string;
  name: string;
  address?: string;
  timezone: string;
  logoUrl?: string;
  defaultLocale: string;
}): Promise<PlatformParishActionState> {
  try {
    await requirePlatformSession();
  } catch (error) {
    return buildError("You do not have permission to update parishes.", "NOT_AUTHORIZED");
  }

  const parsed = updatePlatformParishSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid input.", "VALIDATION_ERROR");
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parsed.data.parishId },
    select: { id: true }
  });

  if (!parish) {
    return buildError("Parish not found.", "NOT_FOUND");
  }

  await prisma.parish.update({
    where: { id: parish.id },
    data: {
      name: parsed.data.name.trim(),
      address: normalizeOptional(parsed.data.address),
      timezone: parsed.data.timezone.trim(),
      logoUrl: normalizeOptional(parsed.data.logoUrl),
      defaultLocale: parsed.data.defaultLocale
    }
  });

  revalidatePath("/platform/parishes");

  return { status: "success", message: "Parish updated." };
}

export async function deactivatePlatformParish(input: {
  parishId: string;
}): Promise<PlatformParishActionState> {
  try {
    await requirePlatformSession();
  } catch {
    return buildError("You do not have permission to deactivate parishes.", "NOT_AUTHORIZED");
  }

  const parsed = platformParishIdSchema.safeParse(input);
  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid input.", "VALIDATION_ERROR");
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parsed.data.parishId },
    select: { id: true, name: true, deactivatedAt: true }
  });

  if (!parish) {
    return buildError("Parish not found.", "NOT_FOUND");
  }

  if (parish.deactivatedAt) {
    return { status: "success", message: "Parish already deactivated." };
  }

  await prisma.parish.update({
    where: { id: parish.id },
    data: { deactivatedAt: new Date() }
  });

  revalidatePath("/platform/parishes");
  return { status: "success", message: `${parish.name} deactivated.` };
}

export async function reactivatePlatformParish(input: {
  parishId: string;
}): Promise<PlatformParishActionState> {
  try {
    await requirePlatformSession();
  } catch {
    return buildError("You do not have permission to reactivate parishes.", "NOT_AUTHORIZED");
  }

  const parsed = platformParishIdSchema.safeParse(input);
  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid input.", "VALIDATION_ERROR");
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parsed.data.parishId },
    select: { id: true, name: true, deactivatedAt: true }
  });

  if (!parish) {
    return buildError("Parish not found.", "NOT_FOUND");
  }

  if (!parish.deactivatedAt) {
    return { status: "success", message: "Parish is already active." };
  }

  await prisma.parish.update({
    where: { id: parish.id },
    data: { deactivatedAt: null }
  });

  revalidatePath("/platform/parishes");
  return { status: "success", message: `${parish.name} reactivated.` };
}

export async function safeDeletePlatformParish(input: {
  parishId: string;
}): Promise<PlatformParishActionState> {
  try {
    await requirePlatformSession();
  } catch {
    return buildError("You do not have permission to delete parishes.", "NOT_AUTHORIZED");
  }

  const parsed = platformParishIdSchema.safeParse(input);
  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid input.", "VALIDATION_ERROR");
  }

  const parishMeta = await prisma.parish.findUnique({
    where: { id: parsed.data.parishId },
    select: { id: true, deactivatedAt: true }
  });

  if (!parishMeta) {
    return buildError("Parish not found.", "NOT_FOUND");
  }

  if (!parishMeta.deactivatedAt) {
    return buildError("Deactivate the parish before safe delete.", "INVALID_STATE");
  }

  const deleteResult = await safeDeleteParish(parishMeta.id);

  if (deleteResult.result === "not_deactivated") {
    return buildError("Deactivate the parish before safe delete.", "INVALID_STATE");
  }

  console.info("[platformParishes.safeDelete] Parish safe delete cleanup summary", {
    parishId: parishMeta.id,
    cleanupCounts: deleteResult.cleanupCounts
  });

  revalidatePath("/platform/parishes");
  return { status: "success", message: `${deleteResult.name} safely deleted.` };
}
