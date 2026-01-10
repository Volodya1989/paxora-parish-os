"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getParishMembership } from "@/server/db/groups";
import { getNow as defaultGetNow } from "@/lib/time/getNow";

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

function buildDraftTitle(title: string | undefined, now: Date) {
  const trimmed = title?.trim();
  if (trimmed) {
    return trimmed;
  }

  const suffix = now.toISOString().replace(/[-:TZ.]/g, "");
  return `New Announcement ${suffix}`;
}

export async function createAnnouncementDraft(input: {
  parishId: string;
  title?: string;
  getNow?: () => Date;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  if (parishId !== input.parishId) {
    throw new Error("Unauthorized");
  }

  await requireParishMembership(userId, parishId);

  const now = (input.getNow ?? defaultGetNow)();

  const announcement = await prisma.announcement.create({
    data: {
      parishId,
      title: buildDraftTitle(input.title, now),
      createdAt: now,
      updatedAt: now
    },
    select: {
      id: true,
      title: true
    }
  });

  revalidatePath("/announcements");

  return announcement;
}

export async function setAnnouncementPublished(input: {
  id: string;
  published: boolean;
  publishedAt?: string;
  getNow?: () => Date;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await requireParishMembership(userId, parishId);

  const now =
    input.published && input.publishedAt
      ? new Date(input.publishedAt)
      : (input.getNow ?? defaultGetNow)();

  const result = await prisma.announcement.updateMany({
    where: {
      id: input.id,
      parishId
    },
    data: input.published
      ? {
          publishedAt: now,
          updatedAt: now
        }
      : {
          publishedAt: null,
          updatedAt: now
        }
  });

  if (result.count === 0) {
    throw new Error("Not found");
  }

  revalidatePath("/announcements");
}

export async function archiveAnnouncement(input: { id: string; getNow?: () => Date }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await requireParishMembership(userId, parishId);

  const now = (input.getNow ?? defaultGetNow)();

  const result = await prisma.announcement.updateMany({
    where: {
      id: input.id,
      parishId
    },
    data: {
      archivedAt: now,
      updatedAt: now
    }
  });

  if (result.count === 0) {
    throw new Error("Not found");
  }

  revalidatePath("/announcements");
}

export async function unarchiveAnnouncement(input: { id: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  await requireParishMembership(userId, parishId);

  const result = await prisma.announcement.updateMany({
    where: {
      id: input.id,
      parishId
    },
    data: {
      archivedAt: null
    }
  });

  if (result.count === 0) {
    throw new Error("Not found");
  }

  revalidatePath("/announcements");
}
