"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getParishMembership, isCoordinatorInParish } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";

function assertSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id, parishId: session.user.activeParishId };
}

async function assertCanManageSpotlight(parishId: string, userId: string) {
  const membership = await getParishMembership(parishId, userId);
  if (!membership) {
    throw new Error("Unauthorized");
  }
  const isLeader = isParishLeader(membership.role);
  const isCoordinator = await isCoordinatorInParish(parishId, userId);
  if (!isLeader && !isCoordinator) {
    throw new Error("Forbidden");
  }
  return { isLeader };
}

export async function createHeroNomination({
  weekId,
  nomineeUserId,
  reason
}: {
  weekId: string;
  nomineeUserId: string;
  reason: string;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);
  await assertCanManageSpotlight(parishId, userId);

  if (!reason.trim()) {
    throw new Error("Reason is required.");
  }

  await prisma.heroNomination.upsert({
    where: {
      parishId_weekId_nomineeUserId: {
        parishId,
        weekId,
        nomineeUserId
      }
    },
    create: {
      parishId,
      weekId,
      nominatorId: userId,
      nomineeUserId,
      reason: reason.trim()
    },
    update: {
      nominatorId: userId,
      reason: reason.trim()
    }
  });

  revalidatePath("/this-week");
  revalidatePath("/gratitude-board");
}

export async function updateHeroNominationReason({
  nominationId,
  reason
}: {
  nominationId: string;
  reason: string;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);
  await assertCanManageSpotlight(parishId, userId);

  if (!reason.trim()) {
    throw new Error("Reason is required.");
  }

  const updated = await prisma.heroNomination.updateMany({
    where: { id: nominationId, parishId },
    data: { reason: reason.trim() }
  });

  if (!updated.count) {
    throw new Error("Nomination not found.");
  }

  revalidatePath("/this-week");
  revalidatePath("/gratitude-board");
}

export async function publishHeroNomination({ nominationId }: { nominationId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);
  await assertCanManageSpotlight(parishId, userId);

  const nomination = await prisma.heroNomination.findUnique({
    where: { id: nominationId },
    select: { id: true, weekId: true, parishId: true }
  });

  if (!nomination || nomination.parishId !== parishId) {
    throw new Error("Nomination not found.");
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: {
      gratitudeSpotlightEnabled: true,
      gratitudeSpotlightLimit: true
    }
  });

  if (!parish?.gratitudeSpotlightEnabled) {
    throw new Error("Gratitude spotlight is disabled for this parish.");
  }

  const publishedCount = await prisma.heroNomination.count({
    where: {
      parishId,
      weekId: nomination.weekId,
      status: "PUBLISHED"
    }
  });

  if (publishedCount >= parish.gratitudeSpotlightLimit) {
    throw new Error("Weekly gratitude spotlight limit reached.");
  }

  await prisma.heroNomination.update({
    where: { id: nominationId },
    data: { status: "PUBLISHED", publishedAt: new Date() }
  });

  revalidatePath("/this-week");
  revalidatePath("/gratitude-board");
}

export async function unpublishHeroNomination({ nominationId }: { nominationId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);
  await assertCanManageSpotlight(parishId, userId);

  const updated = await prisma.heroNomination.updateMany({
    where: { id: nominationId, parishId },
    data: { status: "DRAFT", publishedAt: null }
  });

  if (!updated.count) {
    throw new Error("Nomination not found.");
  }

  revalidatePath("/this-week");
  revalidatePath("/gratitude-board");
}

export async function deleteHeroNomination({ nominationId }: { nominationId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);
  await assertCanManageSpotlight(parishId, userId);

  const deleted = await prisma.heroNomination.deleteMany({
    where: { id: nominationId, parishId }
  });

  if (!deleted.count) {
    throw new Error("Nomination not found.");
  }

  revalidatePath("/this-week");
  revalidatePath("/gratitude-board");
}

export async function updateGratitudeSettings({
  enabled,
  limit
}: {
  enabled: boolean;
  limit: number;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);
  const membership = await getParishMembership(parishId, userId);

  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Forbidden");
  }

  if (limit < 1 || limit > 20) {
    throw new Error("Spotlight limit must be between 1 and 20.");
  }

  await prisma.parish.update({
    where: { id: parishId },
    data: {
      gratitudeSpotlightEnabled: enabled,
      gratitudeSpotlightLimit: limit
    }
  });

  revalidatePath("/gratitude-board");
  revalidatePath("/this-week");
}

export async function updateMilestoneSettings({
  bronzeHours,
  silverHours,
  goldHours
}: {
  bronzeHours: number;
  silverHours: number;
  goldHours: number;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);
  const membership = await getParishMembership(parishId, userId);

  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Forbidden");
  }

  if (bronzeHours < 0 || silverHours < 0 || goldHours < 0) {
    throw new Error("Milestones must be 0 or higher.");
  }

  if (!(bronzeHours <= silverHours && silverHours <= goldHours)) {
    throw new Error("Milestones must be in ascending order.");
  }

  await prisma.parish.update({
    where: { id: parishId },
    data: {
      bronzeHours,
      silverHours,
      goldHours
    }
  });

  revalidatePath("/gratitude-board");
  revalidatePath("/profile");
}
