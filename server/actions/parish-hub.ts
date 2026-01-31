"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import {
  createDefaultParishHubItems,
  getEnabledParishHubItemCount,
  getParishHubItemCount,
  listParishHubItems,
  PARISH_HUB_LIMITS
} from "@/server/db/parish-hub";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import {
  parishHubItemSchema,
  parishHubItemUpdateSchema,
  parishHubItemReorderSchema,
  parishHubSettingsSchema
} from "@/lib/validation/parish-hub";

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

function assertConfiguredTarget(input: {
  targetType: "EXTERNAL" | "INTERNAL";
  targetUrl?: string;
  internalRoute?: string;
}) {
  if (input.targetType === "EXTERNAL" && !input.targetUrl) {
    throw new Error("External targets require a URL.");
  }

  if (input.targetType === "INTERNAL" && !input.internalRoute) {
    throw new Error("Internal targets require a route.");
  }
}

export async function ensureParishHubDefaults() {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertSession(session);

  await requireParishMembership(userId, parishId);

  const existingCount = await getParishHubItemCount(parishId);
  if (existingCount === 0) {
    await createDefaultParishHubItems(parishId);
  }

  return true;
}

export async function listParishHubItemsForMember() {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertSession(session);

  await requireParishMembership(userId, parishId);

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { hubGridEnabled: true }
  });

  if (!parish?.hubGridEnabled) {
    return [];
  }

  return listParishHubItems({
    parishId,
    visibility: "LOGGED_IN"
  });
}

export async function listParishHubItemsForPublic(parishId: string) {
  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { hubGridEnabled: true, hubGridPublicEnabled: true }
  });

  if (!parish?.hubGridEnabled || !parish.hubGridPublicEnabled) {
    return [];
  }

  return listParishHubItems({
    parishId,
    visibility: "PUBLIC"
  });
}

export async function listParishHubItemsForAdmin() {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertSession(session);

  await requireParishLeader(userId, parishId);

  return listParishHubItems({
    parishId,
    visibility: "LOGGED_IN",
    includeDisabled: true
  });
}

export async function createParishHubItem(input: {
  parishId: string;
  actorUserId: string;
  label: string;
  icon: "BULLETIN" | "MASS_TIMES" | "CONFESSION" | "WEBSITE" | "CALENDAR" | "READINGS" | "GIVING" | "CONTACT" | "FACEBOOK" | "YOUTUBE" | "PRAYER" | "NEWS";
  targetType: "EXTERNAL" | "INTERNAL";
  targetUrl?: string | null;
  internalRoute?: string | null;
  visibility: "PUBLIC" | "LOGGED_IN";
  order?: number;
  enabled?: boolean;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertSession(session);

  if (parishId !== input.parishId || userId !== input.actorUserId) {
    throw new Error("Unauthorized");
  }

  await requireParishLeader(userId, parishId);

  const parsed = parishHubItemSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const count = await getParishHubItemCount(parishId);
  if (count >= PARISH_HUB_LIMITS.maxTotal) {
    throw new Error(`Parish hub supports up to ${PARISH_HUB_LIMITS.maxTotal} items.`);
  }

  const enabled = parsed.data.enabled ?? true;
  if (enabled) {
    assertConfiguredTarget({
      targetType: parsed.data.targetType,
      targetUrl: parsed.data.targetUrl,
      internalRoute: parsed.data.internalRoute
    });
  }

  const latestOrder = await prisma.parishHubItem.aggregate({
    where: { parishId },
    _max: { order: true }
  });

  const nextOrder = parsed.data.order ?? (latestOrder._max.order ?? 0) + 1;

  const item = await prisma.parishHubItem.create({
    data: {
      parishId,
      label: parsed.data.label.trim(),
      icon: parsed.data.icon,
      targetType: parsed.data.targetType,
      targetUrl: parsed.data.targetUrl ?? null,
      internalRoute: parsed.data.internalRoute ?? null,
      visibility: parsed.data.visibility,
      order: nextOrder,
      enabled
    },
    select: {
      id: true,
      label: true,
      icon: true,
      targetType: true,
      targetUrl: true,
      internalRoute: true,
      visibility: true,
      order: true,
      enabled: true
    }
  });

  revalidatePath("/parish");

  return item;
}

export async function updateParishHubItem(input: {
  parishId: string;
  actorUserId: string;
  itemId: string;
  label: string;
  icon: "BULLETIN" | "MASS_TIMES" | "CONFESSION" | "WEBSITE" | "CALENDAR" | "READINGS" | "GIVING" | "CONTACT" | "FACEBOOK" | "YOUTUBE" | "PRAYER" | "NEWS";
  targetType: "EXTERNAL" | "INTERNAL";
  targetUrl?: string | null;
  internalRoute?: string | null;
  visibility: "PUBLIC" | "LOGGED_IN";
  order?: number;
  enabled?: boolean;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertSession(session);

  if (parishId !== input.parishId || userId !== input.actorUserId) {
    throw new Error("Unauthorized");
  }

  await requireParishLeader(userId, parishId);

  const parsed = parishHubItemUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const existing = await prisma.parishHubItem.findUnique({
    where: { id: parsed.data.itemId },
    select: { parishId: true, enabled: true }
  });

  if (!existing || existing.parishId !== parishId) {
    throw new Error("Parish hub item not found.");
  }

  const enabled = parsed.data.enabled ?? existing.enabled;
  if (enabled) {
    assertConfiguredTarget({
      targetType: parsed.data.targetType,
      targetUrl: parsed.data.targetUrl,
      internalRoute: parsed.data.internalRoute
    });
  }

  if (existing.enabled && !enabled) {
    const parish = await prisma.parish.findUnique({
      where: { id: parishId },
      select: { hubGridEnabled: true }
    });

    if (parish?.hubGridEnabled) {
      const enabledCount = await getEnabledParishHubItemCount(parishId);
      if (enabledCount <= PARISH_HUB_LIMITS.minEnabled) {
        throw new Error(`Parish hub requires at least ${PARISH_HUB_LIMITS.minEnabled} enabled items.`);
      }
    }
  }

  const item = await prisma.parishHubItem.update({
    where: { id: parsed.data.itemId },
    data: {
      label: parsed.data.label.trim(),
      icon: parsed.data.icon,
      targetType: parsed.data.targetType,
      targetUrl: parsed.data.targetUrl ?? null,
      internalRoute: parsed.data.internalRoute ?? null,
      visibility: parsed.data.visibility,
      order: parsed.data.order ?? undefined,
      enabled
    },
    select: {
      id: true,
      label: true,
      icon: true,
      targetType: true,
      targetUrl: true,
      internalRoute: true,
      visibility: true,
      order: true,
      enabled: true
    }
  });

  revalidatePath("/parish");

  return item;
}

export async function deleteParishHubItem(input: {
  parishId: string;
  actorUserId: string;
  itemId: string;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertSession(session);

  if (parishId !== input.parishId || userId !== input.actorUserId) {
    throw new Error("Unauthorized");
  }

  await requireParishLeader(userId, parishId);

  const existing = await prisma.parishHubItem.findUnique({
    where: { id: input.itemId },
    select: { parishId: true, enabled: true }
  });

  if (!existing || existing.parishId !== parishId) {
    throw new Error("Parish hub item not found.");
  }

  if (existing.enabled) {
    const parish = await prisma.parish.findUnique({
      where: { id: parishId },
      select: { hubGridEnabled: true }
    });

    if (parish?.hubGridEnabled) {
      const enabledCount = await getEnabledParishHubItemCount(parishId);
      if (enabledCount <= PARISH_HUB_LIMITS.minEnabled) {
        throw new Error(`Parish hub requires at least ${PARISH_HUB_LIMITS.minEnabled} enabled items.`);
      }
    }
  }

  await prisma.parishHubItem.delete({
    where: { id: input.itemId }
  });

  revalidatePath("/parish");

  return true;
}

export async function reorderParishHubItems(input: {
  parishId: string;
  actorUserId: string;
  items: Array<{ itemId: string; order: number }>;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertSession(session);

  if (parishId !== input.parishId || userId !== input.actorUserId) {
    throw new Error("Unauthorized");
  }

  await requireParishLeader(userId, parishId);

  const parsed = parishHubItemReorderSchema.safeParse({ items: input.items });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const itemIds = parsed.data.items.map((item) => item.itemId);
  const items = await prisma.parishHubItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, parishId: true }
  });

  if (items.length !== itemIds.length || items.some((item) => item.parishId !== parishId)) {
    throw new Error("Invalid parish hub items.");
  }

  await prisma.$transaction(
    parsed.data.items.map((item) =>
      prisma.parishHubItem.update({
        where: { id: item.itemId },
        data: { order: item.order }
      })
    )
  );

  revalidatePath("/parish");

  return true;
}

export async function updateParishHubSettings(input: {
  parishId: string;
  actorUserId: string;
  hubGridEnabled?: boolean;
  hubGridPublicEnabled?: boolean;
}) {
  const session = await getServerSession(authOptions);
  const { parishId, userId } = assertSession(session);

  if (parishId !== input.parishId || userId !== input.actorUserId) {
    throw new Error("Unauthorized");
  }

  await requireParishLeader(userId, parishId);

  const parsed = parishHubSettingsSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  if (parsed.data.hubGridEnabled) {
    const enabledCount = await getEnabledParishHubItemCount(parishId);
    if (enabledCount < PARISH_HUB_LIMITS.minEnabled) {
      throw new Error(`Parish hub requires at least ${PARISH_HUB_LIMITS.minEnabled} enabled items.`);
    }
  }

  const settings = await prisma.parish.update({
    where: { id: parishId },
    data: {
      hubGridEnabled: parsed.data.hubGridEnabled ?? undefined,
      hubGridPublicEnabled: parsed.data.hubGridPublicEnabled ?? undefined
    },
    select: {
      id: true,
      hubGridEnabled: true,
      hubGridPublicEnabled: true
    }
  });

  revalidatePath("/parish");

  return settings;
}
