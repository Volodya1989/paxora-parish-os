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
  sendAnnouncementEmailSchema,
  sendTestAnnouncementEmailSchema,
  updateAnnouncementSchema,
  updateAnnouncementStatusSchema
} from "@/lib/validation/announcements";
import { notifyAnnouncementPublished } from "@/lib/push/notify";
import { notifyAnnouncementPublishedInApp } from "@/lib/notifications/notify";
import { sanitizeAnnouncementHtml, stripHtmlToText } from "@/lib/sanitize/html";
import { sendEmail } from "@/lib/email/emailService";
import { renderAnnouncementEmail } from "@/emails/templates/announcement";

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

  // Fire-and-forget push notification when publishing
  if (parsed.data.published) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: parsed.data.id },
      select: { title: true }
    });
    if (announcement) {
      notifyAnnouncementPublished({
        announcementId: parsed.data.id,
        title: announcement.title,
        parishId,
        publisherId: userId
      }).catch(() => {});
      notifyAnnouncementPublishedInApp({
        announcementId: parsed.data.id,
        title: announcement.title,
        parishId,
        publisherId: userId
      }).catch((error) => {
        console.error("[announcements] Failed to create in-app notification:", error);
      });
    }
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
  bodyHtml?: string;
  bodyText?: string;
  audienceUserIds?: string[];
  published: boolean;
  getNow?: () => Date;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = createAnnouncementSchema.safeParse({
    parishId: input.parishId,
    title: input.title,
    body: input.body,
    bodyHtml: input.bodyHtml,
    bodyText: input.bodyText,
    audienceUserIds: input.audienceUserIds,
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

  const sanitizedHtml = parsed.data.bodyHtml
    ? sanitizeAnnouncementHtml(parsed.data.bodyHtml)
    : null;
  const plainText = parsed.data.bodyText
    ? parsed.data.bodyText
    : sanitizedHtml
      ? stripHtmlToText(sanitizedHtml)
      : null;

  const announcement = await prisma.announcement.create({
    data: {
      parishId,
      title: parsed.data.title,
      body: parsed.data.body,
      bodyHtml: sanitizedHtml,
      bodyText: plainText,
      audienceUserIds: parsed.data.audienceUserIds ?? [],
      createdById: userId,
      publishedAt: parsed.data.published ? now : null,
      createdAt: now,
      updatedAt: now
    }
  });

  // Fire-and-forget push notification when created as published
  if (parsed.data.published) {
    notifyAnnouncementPublished({
      announcementId: announcement.id,
      title: parsed.data.title,
      parishId,
      publisherId: userId
    }).catch(() => {});
    notifyAnnouncementPublishedInApp({
      announcementId: announcement.id,
      title: parsed.data.title,
      parishId,
      publisherId: userId
    }).catch((error) => {
      console.error("[announcements] Failed to create in-app notification:", error);
    });
  }

  revalidatePath("/announcements");

  return announcement;
}

export async function updateAnnouncement(input: {
  id: string;
  title: string;
  body: string;
  bodyHtml?: string;
  bodyText?: string;
  audienceUserIds?: string[];
  published: boolean;
  getNow?: () => Date;
}) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = updateAnnouncementSchema.safeParse({
    id: input.id,
    title: input.title,
    body: input.body,
    bodyHtml: input.bodyHtml,
    bodyText: input.bodyText,
    audienceUserIds: input.audienceUserIds,
    published: input.published
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await requireParishLeader(userId, parishId);

  const now = (input.getNow ?? defaultGetNow)();

  const sanitizedHtml = parsed.data.bodyHtml
    ? sanitizeAnnouncementHtml(parsed.data.bodyHtml)
    : null;
  const plainText = parsed.data.bodyText
    ? parsed.data.bodyText
    : sanitizedHtml
      ? stripHtmlToText(sanitizedHtml)
      : null;

  const result = await prisma.announcement.updateMany({
    where: {
      id: parsed.data.id,
      parishId
    },
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      bodyHtml: sanitizedHtml,
      bodyText: plainText,
      audienceUserIds: parsed.data.audienceUserIds ?? [],
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

export async function sendAnnouncementEmail(input: { announcementId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = sendAnnouncementEmailSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await requireParishLeader(userId, parishId);

  const announcement = await prisma.announcement.findFirst({
    where: {
      id: parsed.data.announcementId,
      parishId,
      archivedAt: null
    },
    select: {
      id: true,
      title: true,
      body: true,
      bodyHtml: true,
      bodyText: true,
      audienceUserIds: true,
      publishedAt: true
    }
  });

  if (!announcement) {
    throw new Error("Not found");
  }

  const audienceIds = announcement.audienceUserIds;
  if (!audienceIds || audienceIds.length === 0) {
    throw new Error("No recipients selected. Please select an audience first.");
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";

  const emailContent = renderAnnouncementEmail({
    appUrl,
    parishName: parish?.name ?? "Parish",
    title: announcement.title,
    bodyHtml: announcement.bodyHtml ?? announcement.body ?? "",
    bodyText: announcement.bodyText ?? announcement.body ?? "",
    announcementId: announcement.id
  });

  // Resolve recipients from audience user IDs
  const recipients = await prisma.membership.findMany({
    where: {
      parishId,
      userId: { in: audienceIds }
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    const result = await sendEmail({
      type: "ANNOUNCEMENT",
      template: "announcement",
      toEmail: recipient.user.email,
      userId: recipient.user.id,
      parishId,
      announcementId: announcement.id,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    if (result.status === "SENT") {
      sentCount++;
    } else if (result.status === "FAILED") {
      failedCount++;
    }
  }

  revalidatePath("/announcements");

  return { sentCount, failedCount, totalCount: recipients.length };
}

export async function sendTestAnnouncementEmail(input: { announcementId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = sendTestAnnouncementEmailSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  await requireParishLeader(userId, parishId);

  const announcement = await prisma.announcement.findFirst({
    where: {
      id: parsed.data.announcementId,
      parishId,
      archivedAt: null
    },
    select: {
      id: true,
      title: true,
      body: true,
      bodyHtml: true,
      bodyText: true
    }
  });

  if (!announcement) {
    throw new Error("Not found");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error("Your account has no email address.");
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "";

  const emailContent = renderAnnouncementEmail({
    appUrl,
    parishName: parish?.name ?? "Parish",
    title: `[TEST] ${announcement.title}`,
    bodyHtml: announcement.bodyHtml ?? announcement.body ?? "",
    bodyText: announcement.bodyText ?? announcement.body ?? "",
    announcementId: announcement.id
  });

  const result = await sendEmail({
    type: "ANNOUNCEMENT",
    template: "announcement-test",
    toEmail: user.email,
    userId,
    parishId,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text
  });

  if (result.status === "FAILED") {
    throw new Error("Failed to send test email. Please check your email configuration.");
  }

  return { status: result.status, email: user.email };
}

export async function getAnnouncementPeople(input: { parishId: string }) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  if (parishId !== input.parishId) {
    throw new Error("Unauthorized");
  }

  await requireParishLeader(userId, parishId);

  const memberships = await prisma.membership.findMany({
    where: { parishId },
    orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return memberships.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email
  }));
}
