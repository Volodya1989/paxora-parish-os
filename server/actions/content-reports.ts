"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getGroupMembership, getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import type { ContentReportStatus } from "@prisma/client";
import { notifyContentReportSubmittedInApp } from "@/lib/notifications/notify";

const MIN_REASON_LENGTH = 10;

type SubmitContentReportInput = {
  contentType: "CHAT_MESSAGE" | "ANNOUNCEMENT" | "GROUP_CONTENT";
  contentId: string;
  reason?: string | null;
  details?: string | null;
};

type UpdateContentReportStatusInput = {
  reportId: string;
  status: Exclude<ContentReportStatus, "OPEN">;
};

function normalizeOptionalText(value?: string | null, maxLength = 240) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

async function assertSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  return {
    userId: session.user.id,
    parishId: session.user.activeParishId
  };
}

async function ensureCanReportChatMessage(parishId: string, userId: string, contentId: string) {
  const message = await prisma.chatMessage.findFirst({
    where: {
      id: contentId,
      deletedAt: null,
      channel: {
        parishId
      }
    },
    select: {
      id: true,
      channel: {
        select: {
          type: true,
          groupId: true
        }
      }
    }
  });

  if (!message) {
    throw new Error("Not found");
  }

  const parishMembership = await getParishMembership(parishId, userId);
  if (!parishMembership) {
    throw new Error("Unauthorized");
  }

  if (message.channel.type === "GROUP") {
    if (isParishLeader(parishMembership.role)) {
      return;
    }

    if (!message.channel.groupId) {
      throw new Error("Not found");
    }

    const groupMembership = await getGroupMembership(message.channel.groupId, userId);
    if (!groupMembership || groupMembership.status !== "ACTIVE") {
      throw new Error("Forbidden");
    }
  }
}

async function ensureCanReportAnnouncement(parishId: string, userId: string, contentId: string) {
  const [membership, announcement] = await Promise.all([
    getParishMembership(parishId, userId),
    prisma.announcement.findFirst({
      where: {
        id: contentId,
        parishId,
        archivedAt: null,
        publishedAt: {
          not: null
        }
      },
      select: { id: true }
    })
  ]);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  if (!announcement) {
    throw new Error("Not found");
  }
}

async function ensureCanReportGroupContent(parishId: string, userId: string, contentId: string) {
  const [membership, group] = await Promise.all([
    getParishMembership(parishId, userId),
    prisma.group.findFirst({
      where: {
        id: contentId,
        parishId,
        archivedAt: null,
        status: "ACTIVE"
      },
      select: {
        id: true,
        visibility: true
      }
    })
  ]);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  if (!group) {
    throw new Error("Not found");
  }

  if (group.visibility === "PRIVATE" && !isParishLeader(membership.role)) {
    const groupMembership = await getGroupMembership(group.id, userId);
    if (!groupMembership || groupMembership.status !== "ACTIVE") {
      throw new Error("Forbidden");
    }
  }
}

export async function submitContentReport(input: SubmitContentReportInput) {
  const { userId, parishId } = await assertSession();

  const contentId = input.contentId.trim();
  if (!contentId) {
    throw new Error("Content id is required");
  }

  if (input.contentType === "CHAT_MESSAGE") {
    await ensureCanReportChatMessage(parishId, userId, contentId);
  } else if (input.contentType === "ANNOUNCEMENT") {
    await ensureCanReportAnnouncement(parishId, userId, contentId);
  } else {
    await ensureCanReportGroupContent(parishId, userId, contentId);
  }

  const reason = normalizeOptionalText(input.reason, 500);
  if (!reason || reason.length < MIN_REASON_LENGTH) {
    throw new Error("Reason is required (minimum 10 characters)");
  }
  const details = normalizeOptionalText(input.details, 500);

  const existing = await prisma.contentReport.findUnique({
    where: {
      ContentReport_dedupe: {
        parishId,
        reporterUserId: userId,
        contentType: input.contentType,
        contentId
      }
    },
    select: {
      id: true,
      status: true
    }
  });

  if (existing) {
    const updated = await prisma.contentReport.update({
      where: {
        id: existing.id
      },
      data: {
        status: "OPEN",
        reason,
        details,
        reviewerUserId: null
      },
      select: {
        id: true
      }
    });

    return {
      id: updated.id,
      duplicate: true
    };
  }

  const created = await prisma.contentReport.create({
    data: {
      parishId,
      reporterUserId: userId,
      contentType: input.contentType,
      contentId,
      reason,
      details
    },
    select: {
      id: true
    }
  });

  revalidatePath("/admin/reports");

  notifyContentReportSubmittedInApp({
    parishId,
    reporterId: userId,
    contentType: input.contentType
  }).catch((error) => {
    console.error("[content-reports] Failed to create in-app notification:", error);
  });

  return {
    id: created.id,
    duplicate: false
  };
}

export async function updateContentReportStatus(input: UpdateContentReportStatusInput) {
  const { userId, parishId } = await assertSession();

  await requireAdminOrShepherd(userId, parishId);

  const report = await prisma.contentReport.findFirst({
    where: {
      id: input.reportId,
      parishId
    },
    select: {
      id: true
    }
  });

  if (!report) {
    throw new Error("Not found");
  }

  await prisma.contentReport.update({
    where: {
      id: report.id
    },
    data: {
      status: input.status,
      reviewerUserId: userId
    }
  });

  revalidatePath("/admin/reports");
}

export async function listParishContentReports() {
  const { userId, parishId } = await assertSession();

  await requireAdminOrShepherd(userId, parishId);

  return prisma.contentReport.findMany({
    where: {
      parishId
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      contentType: true,
      contentId: true,
      reason: true,
      status: true,
      createdAt: true,
      reporter: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}
