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

export async function createPlatformParish(input: {
  name: string;
  address?: string;
  timezone: string;
  logoUrl?: string;
  defaultLocale: string;
}): Promise<PlatformParishActionState> {
  const parsed = platformParishSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid input.", "VALIDATION_ERROR");
  }

  try {
    await requirePlatformSession();
  } catch (error) {
    return buildError("You do not have permission to create parishes.", "NOT_AUTHORIZED");
  }

  const baseSlug = slugify(parsed.data.name);
  const slug = await ensureUniqueSlug(baseSlug);

  const parish = await prisma.parish.create({
    data: {
      name: parsed.data.name.trim(),
      slug,
      address: normalizeOptional(parsed.data.address),
      timezone: parsed.data.timezone.trim(),
      logoUrl: normalizeOptional(parsed.data.logoUrl),
      defaultLocale: parsed.data.defaultLocale
    }
  });

  await createDefaultParishHubItems(parish.id);

  revalidatePath("/platform/parishes");

  return { status: "success", message: "Parish created." };
}

export async function updatePlatformParish(input: {
  parishId: string;
  name: string;
  address?: string;
  timezone: string;
  logoUrl?: string;
  defaultLocale: string;
}): Promise<PlatformParishActionState> {
  const parsed = updatePlatformParishSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid input.", "VALIDATION_ERROR");
  }

  try {
    await requirePlatformSession();
  } catch (error) {
    return buildError("You do not have permission to update parishes.", "NOT_AUTHORIZED");
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
