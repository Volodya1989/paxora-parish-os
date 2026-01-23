"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { getNow as defaultGetNow } from "@/lib/time/getNow";
import {
  createAnnouncementSchema,
  deleteAnnouncementSchema,
  updateAnnouncementSchema,
  updateAnnouncementStatusSchema
} from "@/lib/validation/announcements";

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

  await requireParishLeader(userId, parishId);

  const now = (input.getNow ?? defaultGetNow)();

  const announcement = await prisma.announcement.create({
    data: {
      parishId,
      title: buildDraftTitle(input.title, now),
      createdById: userId,
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

  const parsed = updateAnnouncementStatusSchema.safeParse({
    id: input.id,
    published: input.published,
    publishedAt: input.publishedAt
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await requireParishLeader(userId, parishId);

  const now =
    parsed.data.published && parsed.data.publishedAt
      ? new Date(parsed.data.publishedAt)
      : (input.getNow ?? defaultGetNow)();

  const result = await prisma.announcement.updateMany({
    where: {
      id: parsed.data.id,
      parishId
    },
    data: parsed.data.published
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

  await requireParishLeader(userId, parishId);

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

  await requireParishLeader(userId, parishId);

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

export async function createAnnouncement(input: {
  parishId: string;
  title: string;
  body: string;
  published: boolean;
  getNow?: () => Date;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = createAnnouncementSchema.safeParse({
    parishId: input.parishId,
    title: input.title,
    body: input.body,
    published: input.published
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  if (parishId !== parsed.data.parishId) {
    throw new Error("Unauthorized");
  }

  await requireParishLeader(userId, parishId);

  const now = (input.getNow ?? defaultGetNow)();

  const announcement = await prisma.announcement.create({
    data: {
      parishId,
      title: parsed.data.title,
      body: parsed.data.body,
      createdById: userId,
      publishedAt: parsed.data.published ? now : null,
      createdAt: now,
      updatedAt: now
    }
  });

  revalidatePath("/announcements");

  return announcement;
}

export async function updateAnnouncement(input: {
  id: string;
  title: string;
  body: string;
  published: boolean;
  getNow?: () => Date;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = updateAnnouncementSchema.safeParse({
    id: input.id,
    title: input.title,
    body: input.body,
    published: input.published
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await requireParishLeader(userId, parishId);

  const now = (input.getNow ?? defaultGetNow)();

  const result = await prisma.announcement.updateMany({
    where: {
      id: parsed.data.id,
      parishId
    },
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      publishedAt: parsed.data.published ? now : null,
      updatedAt: now
    }
  });

  if (result.count === 0) {
    throw new Error("Not found");
  }

  revalidatePath("/announcements");
}

export async function deleteAnnouncement(input: { id: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = deleteAnnouncementSchema.safeParse({ id: input.id });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await requireParishLeader(userId, parishId);

  const result = await prisma.announcement.deleteMany({
    where: {
      id: parsed.data.id,
      parishId
    }
  });

  if (result.count === 0) {
    throw new Error("Not found");
  }

  revalidatePath("/announcements");
}
