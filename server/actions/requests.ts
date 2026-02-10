"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import {
  createRequestSchema,
  requestEmailSchema,
  requestResponseSchema,
  scheduleRequestSchema
} from "@/lib/validation/requests";
import {
  REQUEST_VISIBILITY_LABELS,
  getDefaultVisibilityForType,
  getRequestStatusLabel,
  getRequestTypeLabel
} from "@/lib/requests/utils";
import { sendRequestAssignmentEmail } from "@/lib/email/requestNotifications";
import { notifyRequestAssigned } from "@/lib/push/notify";
import {
  notifyRequestAssignedInApp,
  notifyRequestStatusUpdatedInApp
} from "@/lib/notifications/notify";
import { getWeekEnd, getWeekLabel, getWeekStartMonday } from "@/lib/date/week";
import { parseParishDateTime } from "@/lib/time/parish";
import {
  appendRequestActivity,
  appendRequestHistory,
  hasRequestEmailHistoryEntry,
  parseRequestDetails,
  type RequestDetails
} from "@/lib/requests/details";
import {
  sendRequestCancellationEmail,
  sendRequestInfoEmail,
  sendRequestScheduleEmail,
  sendRequestUnableToScheduleEmail
} from "@/lib/email/requesterRequests";

export type RequestActionResult = { status: "success" | "error"; message?: string };

const hashEmailPayload = (payload: Record<string, unknown>) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

async function getOrCreateWeekForDate(parishId: string, startsAt: Date) {
  const weekStart = getWeekStartMonday(startsAt);
  const weekEnd = getWeekEnd(weekStart);

  const existing = await prisma.week.findUnique({
    where: {
      parishId_startsOn: {
        parishId,
        startsOn: weekStart
      }
    }
  });

  return (
    existing ??
    prisma.week.create({
      data: {
        parishId,
        startsOn: weekStart,
        endsOn: weekEnd,
        label: getWeekLabel(weekStart)
      }
    })
  );
}

export async function createRequest(formData: FormData): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to submit a request." };
  }

  const parsed = createRequestSchema.safeParse({
    type: formData.get("type")?.toString(),
    title: formData.get("title")?.toString(),
    requesterName: formData.get("requesterName")?.toString(),
    requesterEmail: formData.get("requesterEmail")?.toString(),
    requesterPhone: formData.get("requesterPhone")?.toString() ?? undefined,
    description: formData.get("description")?.toString(),
    preferredTimeWindow: formData.get("preferredTimeWindow")?.toString() ?? undefined,
    notes: formData.get("notes")?.toString() ?? undefined
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.errors[0]?.message ?? "Invalid request." };
  }

  const {
    type,
    title,
    requesterName,
    requesterEmail,
    requesterPhone,
    description,
    preferredTimeWindow
  } = parsed.data;
  const visibilityScope = getDefaultVisibilityForType(type);
  const details: Record<string, string> = {
    requesterName,
    requesterEmail,
    description
  };

  if (preferredTimeWindow) {
    details.preferredTimeWindow = preferredTimeWindow;
  }
  if (requesterPhone) {
    details.requesterPhone = requesterPhone;
  }

  try {
    await prisma.request.create({
      data: {
        parishId: session.user.activeParishId,
        createdByUserId: session.user.id,
        type,
        title,
        visibilityScope,
        details: Object.keys(details).length ? details : Prisma.DbNull
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      console.error("[requests] Request table missing (P2021) — run prisma migrate deploy", error.message);
      return {
        status: "error",
        message: "Requests are not available yet. Please try again after the system update."
      };
    }
    console.error("[requests] Failed to create request", error);
    return {
      status: "error",
      message: "Something went wrong while submitting your request. Please try again."
    };
  }

  revalidatePath("/requests");
  revalidatePath("/admin/requests");

  return { status: "success" };
}

export async function updateRequestStatus(input: {
  requestId: string;
  status: "SUBMITTED" | "ACKNOWLEDGED" | "SCHEDULED" | "COMPLETED" | "CANCELED";
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to perform this action." };
  }

  const parishId = session.user.activeParishId;
  await requireAdminOrShepherd(session.user.id, parishId);

  const request = await prisma.request.findUnique({
    where: { id: input.requestId },
    select: { id: true, parishId: true, status: true, title: true, createdByUserId: true, details: true }
  });

  if (!request || request.parishId !== parishId) {
    return { status: "error", message: "Request not found." };
  }

  if (request.status === input.status) {
    return { status: "success" };
  }

  const actorName = session.user.name ?? session.user.email ?? "Unknown";
  const activityEntry = {
    occurredAt: new Date().toISOString(),
    type: "STATUS" as const,
    actorId: session.user.id,
    actorName,
    description: `Status changed from ${getRequestStatusLabel(request.status)} to ${getRequestStatusLabel(input.status)}.`
  };
  const detailsWithActivity = appendRequestActivity(request.details, activityEntry);

  await prisma.request.update({
    where: { id: request.id },
    data: { status: input.status, details: detailsWithActivity as Prisma.InputJsonValue }
  });

  if (request.createdByUserId && request.createdByUserId !== session.user.id) {
    notifyRequestStatusUpdatedInApp({
      requestId: request.id,
      requestTitle: request.title,
      parishId,
      requesterId: request.createdByUserId,
      status: input.status
    }).catch((error) => {
      console.error("[requests] Failed to create in-app status notification:", error);
    });
  }

  revalidatePath("/admin/requests");
  revalidatePath("/requests");

  return { status: "success" };
}

export async function updateRequestVisibility(input: {
  requestId: string;
  visibilityScope: "CLERGY_ONLY" | "ADMIN_ALL" | "ADMIN_SPECIFIC";
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to perform this action." };
  }

  const parishId = session.user.activeParishId;
  await requireAdminOrShepherd(session.user.id, parishId);

  const request = await prisma.request.findUnique({
    where: { id: input.requestId },
    select: {
      assignedToUserId: true,
      parishId: true,
      status: true,
      visibilityScope: true,
      details: true
    }
  });

  if (!request || request.parishId !== parishId) {
    return { status: "error", message: "Request not found." };
  }

  if (request.status === "COMPLETED") {
    return { status: "error", message: "Completed requests cannot be canceled." };
  }

  if (["COMPLETED", "CANCELED"].includes(request.status)) {
    return { status: "error", message: "This request can no longer be scheduled." };
  }

  if (input.visibilityScope === "CLERGY_ONLY" && request.assignedToUserId) {
    const assignee = await prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId: request.parishId,
          userId: request.assignedToUserId
        }
      },
      select: { role: true }
    });

    if (assignee && assignee.role !== "SHEPHERD") {
      return {
        status: "error",
        message: "Clergy-only requests can only be assigned to clergy."
      };
    }
  }

  if (request.visibilityScope !== input.visibilityScope) {
    const actorName = session.user.name ?? session.user.email ?? "Unknown";
    const activityEntry = {
      occurredAt: new Date().toISOString(),
      type: "VISIBILITY" as const,
      actorId: session.user.id,
      actorName,
      description: `Visibility changed from ${REQUEST_VISIBILITY_LABELS[request.visibilityScope]} to ${REQUEST_VISIBILITY_LABELS[input.visibilityScope]}.`
    };
    const detailsWithActivity = appendRequestActivity(request.details, activityEntry);

    await prisma.request.update({
      where: { id: input.requestId },
      data: {
        visibilityScope: input.visibilityScope,
        details: detailsWithActivity as Prisma.InputJsonValue
      }
    });
  }

  revalidatePath("/admin/requests");
  revalidatePath("/requests");

  return { status: "success" };
}

export async function assignRequest(input: {
  requestId: string;
  assigneeId: string | null;
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to perform this action." };
  }

  const parishId = session.user.activeParishId;
  await requireAdminOrShepherd(session.user.id, parishId);

  const request = await prisma.request.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      parishId: true,
      status: true,
      title: true,
      type: true,
      visibilityScope: true,
      assignedToUserId: true,
      details: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!request || request.parishId !== parishId) {
    return { status: "error", message: "Request not found." };
  }

  if (request.assignedToUserId === input.assigneeId) {
    return { status: "success" };
  }

  let assignee = null as null | {
    userId: string;
    role: "ADMIN" | "SHEPHERD" | "MEMBER";
    notifyEmailEnabled: boolean;
    user: { email: string; name: string | null };
  };

  if (input.assigneeId) {
    assignee = await prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId,
          userId: input.assigneeId
        }
      },
      select: {
        userId: true,
        role: true,
        notifyEmailEnabled: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (!assignee) {
      return { status: "error", message: "Assignee not found." };
    }

    if (request.visibilityScope === "CLERGY_ONLY" && assignee.role !== "SHEPHERD") {
      return {
        status: "error",
        message: "Clergy-only requests can only be assigned to clergy."
      };
    }
  }

  const actorName = session.user.name ?? session.user.email ?? "Unknown";
  const previousAssigneeLabel = request.assignedTo?.name
    ? `${request.assignedTo.name} (${request.assignedTo.email})`
    : request.assignedTo?.email ?? "Unassigned";
  const nextAssigneeLabel = assignee
    ? assignee.user.name
      ? `${assignee.user.name} (${assignee.user.email})`
      : assignee.user.email
    : "Unassigned";
  const activityEntry = {
    occurredAt: new Date().toISOString(),
    type: "ASSIGNMENT" as const,
    actorId: session.user.id,
    actorName,
    description:
      previousAssigneeLabel === nextAssigneeLabel
        ? `Assignment kept as ${nextAssigneeLabel}.`
        : `Assignment changed from ${previousAssigneeLabel} to ${nextAssigneeLabel}.`
  };
  const detailsWithActivity = appendRequestActivity(request.details, activityEntry);

  await prisma.request.update({
    where: { id: input.requestId },
    data: { assignedToUserId: input.assigneeId, details: detailsWithActivity as Prisma.InputJsonValue }
  });

  if (assignee && assignee.user.email) {
    const parish = await prisma.parish.findUnique({
      where: { id: parishId },
      select: { name: true }
    });

    if (parish) {
      try {
        await sendRequestAssignmentEmail({
          parishId,
          parishName: parish.name,
          requestId: request.id,
          requestTitle: request.title,
          requestTypeLabel: getRequestTypeLabel(request.type),
          assignee: {
            userId: assignee.userId,
            email: assignee.user.email,
            name: assignee.user.name,
            notifyEmailEnabled: assignee.notifyEmailEnabled,
            role: assignee.role
          }
        });
      } catch (error) {
        console.error("Failed to send request assignment email", error);
      }
    }

    try {
      await notifyRequestAssigned({
        requestId: request.id,
        requestTitle: request.title,
        parishId,
        assigneeId: assignee.userId
      });
    } catch (error) {
      console.error("Failed to send request assignment push", error);
    }

    notifyRequestAssignedInApp({
      requestId: request.id,
      requestTitle: request.title,
      parishId,
      assigneeId: assignee.userId
    }).catch((error) => {
      console.error("[requests] Failed to create in-app assignment notification:", error);
    });
  }

  revalidatePath("/admin/requests");
  revalidatePath("/requests");

  return { status: "success" };
}

export async function sendRequestInfoEmailAction(input: {
  requestId: string;
  note?: string;
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to perform this action." };
  }

  const parsed = requestEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.errors[0]?.message ?? "Invalid request." };
  }

  const parishId = session.user.activeParishId;
  await requireAdminOrShepherd(session.user.id, parishId);

  const request = await prisma.request.findUnique({
    where: { id: parsed.data.requestId },
    select: {
      id: true,
      parishId: true,
      title: true,
      type: true,
      status: true,
      details: true,
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });

  if (!request || request.parishId !== parishId) {
    return { status: "error", message: "Request not found." };
  }

  if (request.status === "COMPLETED") {
    return { status: "error", message: "Completed requests cannot be canceled." };
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

  const details = parseRequestDetails(request.details);
  const requesterName = details?.requesterName ?? request.createdBy.name ?? null;
  const requesterEmail = details?.requesterEmail ?? request.createdBy.email;

  if (!requesterEmail) {
    return { status: "error", message: "Requester email is missing." };
  }

  const payloadHash = hashEmailPayload({ note: parsed.data.note ?? "" });
  const alreadySent = hasRequestEmailHistoryEntry(request.details, {
    type: "NEED_MORE_INFO",
    payloadHash
  });

  if (alreadySent) {
    return { status: "success", message: "Email already sent." };
  }

  const email = await sendRequestInfoEmail({
    parishId,
    parishName: parish?.name ?? "Your parish",
    requestId: request.id,
    requestTitle: request.title,
    requestTypeLabel: getRequestTypeLabel(request.type),
    requester: {
      userId: request.createdBy.id,
      name: requesterName,
      email: requesterEmail,
      role: "MEMBER"
    },
    note: parsed.data.note
  });

  if (email.status !== "SENT") {
    return { status: "error", message: "Email failed to send." };
  }

  if (email.status === "SENT") {
    const actorName = session.user.name ?? session.user.email ?? "Unknown";
    const historyEntry = {
      sentAt: new Date().toISOString(),
      type: "NEED_MORE_INFO" as const,
      template: "NEED_INFO" as const,
      subject: email.subject,
      note: parsed.data.note,
      sentByUserId: session.user.id,
      sentByName: actorName,
      payloadHash
    };
    const detailsWithHistory = appendRequestHistory(request.details, historyEntry);
    await prisma.request.update({
      where: { id: request.id },
      data: { details: detailsWithHistory as Prisma.InputJsonValue }
    });
  }

  revalidatePath("/admin/requests");
  revalidatePath("/requests");

  return { status: "success" };
}

export async function scheduleRequest(input: {
  requestId: string;
  date: string;
  startTime: string;
  endTime: string;
  note?: string;
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to perform this action." };
  }

  const parsed = scheduleRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.errors[0]?.message ?? "Invalid schedule." };
  }

  const parishId = session.user.activeParishId;
  await requireAdminOrShepherd(session.user.id, parishId);

  const request = await prisma.request.findUnique({
    where: { id: parsed.data.requestId },
    select: {
      id: true,
      parishId: true,
      title: true,
      type: true,
      status: true,
      details: true,
      createdByUserId: true,
      assignedToUserId: true,
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });

  if (!request || request.parishId !== parishId) {
    return { status: "error", message: "Request not found." };
  }

  if (request.status === "COMPLETED") {
    return { status: "error", message: "Completed requests cannot be canceled." };
  }

  if (["COMPLETED", "CANCELED"].includes(request.status)) {
    return { status: "error", message: "This request can no longer be scheduled." };
  }

  const startsAt = parseParishDateTime(parsed.data.date, parsed.data.startTime);
  const endsAt = parseParishDateTime(parsed.data.date, parsed.data.endTime);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { status: "error", message: "Enter a valid date and time." };
  }

  if (endsAt <= startsAt) {
    return { status: "error", message: "End time must be after the start time." };
  }

  const actorName = session.user.name ?? session.user.email ?? "Unknown";
  const details = parseRequestDetails(request.details) ?? {};
  const startsAtIso = startsAt.toISOString();
  const endsAtIso = endsAt.toISOString();
  const existingSchedule = details.schedule ?? null;
  const scheduleMatches =
    existingSchedule?.startsAt === startsAtIso && existingSchedule?.endsAt === endsAtIso;
  const schedulePayloadHash = hashEmailPayload({ startsAt: startsAtIso, endsAt: endsAtIso });
  const scheduleAlreadySent = hasRequestEmailHistoryEntry(request.details, {
    type: "SCHEDULE",
    payloadHash: schedulePayloadHash
  });

  let eventId = existingSchedule?.eventId ?? null;

  if (existingSchedule?.eventId && !scheduleMatches) {
    await prisma.event.delete({ where: { id: existingSchedule.eventId } }).catch(() => null);
    eventId = null;
  }

  if (!eventId) {
    const week = await getOrCreateWeekForDate(parishId, startsAt);
    const event = await prisma.event.create({
      data: {
        parishId,
        weekId: week.id,
        title: `Request: ${request.title}`,
        startsAt,
        endsAt,
        summary: `Scheduled request · ${getRequestTypeLabel(request.type)}`,
        visibility: "PRIVATE",
        type: "EVENT"
      },
      select: { id: true }
    });
    eventId = event.id;
  }

  if (request.assignedToUserId && eventId) {
    await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId: eventId, userId: request.assignedToUserId } },
      update: { response: "YES" },
      create: { eventId: eventId, userId: request.assignedToUserId, response: "YES" }
    });
  }

  // Create RSVP for requester so the event is visible on their calendar
  if (eventId) {
    await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId: eventId, userId: request.createdByUserId } },
      update: { response: "MAYBE" },
      create: { eventId: eventId, userId: request.createdByUserId, response: "MAYBE" }
    });
  }

  if (!eventId) {
    return { status: "error", message: "Unable to schedule this request. Please try again." };
  }

  const { scheduleResponse: _scheduleResponse, ...detailsWithoutResponse } = details;
  const baseDetails = scheduleMatches ? details : detailsWithoutResponse;
  let detailsWithSchedule: RequestDetails = {
    ...baseDetails,
    schedule: {
      eventId,
      startsAt: startsAtIso,
      endsAt: endsAtIso
    }
  };

  if (request.status !== "SCHEDULED") {
    detailsWithSchedule = appendRequestActivity(detailsWithSchedule, {
      occurredAt: new Date().toISOString(),
      type: "STATUS" as const,
      actorId: session.user.id,
      actorName,
      description: `Status changed to ${getRequestStatusLabel("SCHEDULED")}.`
    });
  }

  if (!existingSchedule) {
    detailsWithSchedule = appendRequestActivity(detailsWithSchedule, {
      occurredAt: new Date().toISOString(),
      type: "SCHEDULE" as const,
      actorId: session.user.id,
      actorName,
      description: `Scheduled for ${startsAt.toLocaleString()}.`
    });
  } else if (!scheduleMatches) {
    detailsWithSchedule = appendRequestActivity(detailsWithSchedule, {
      occurredAt: new Date().toISOString(),
      type: "SCHEDULE" as const,
      actorId: session.user.id,
      actorName,
      description: `Schedule updated from ${new Date(existingSchedule.startsAt).toLocaleString()} to ${startsAt.toLocaleString()}.`
    });
  }

  await prisma.request.update({
    where: { id: request.id },
    data: {
      status: "SCHEDULED",
      details: detailsWithSchedule as Prisma.InputJsonValue
    }
  });

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

  const requesterName = details.requesterName ?? request.createdBy.name ?? null;
  const requesterEmail = details.requesterEmail ?? request.createdBy.email;
  const hasRequesterEmail = Boolean(requesterEmail);
  let emailStatus: "SENT" | "FAILED" | "SKIPPED" | null = null;

  if (requesterEmail && !scheduleAlreadySent) {
    const email = await sendRequestScheduleEmail({
      parishId,
      parishName: parish?.name ?? "Your parish",
      requestId: request.id,
      requestTitle: request.title,
      requestTypeLabel: getRequestTypeLabel(request.type),
      requester: {
        userId: request.createdBy.id,
        name: requesterName,
        email: requesterEmail,
        role: "MEMBER"
      },
      scheduleWindow: `${startsAt.toLocaleString()} - ${endsAt.toLocaleTimeString()}`,
      note: parsed.data.note
    });

    emailStatus = email.status;

    if (email.status === "SENT") {
      const historyEntry = {
        sentAt: new Date().toISOString(),
        type: "SCHEDULE" as const,
        template: "SCHEDULE" as const,
        subject: email.subject,
        note: parsed.data.note,
        sentByUserId: session.user.id,
        sentByName: actorName,
        payloadHash: schedulePayloadHash
      };
      const updatedDetails = appendRequestHistory(detailsWithSchedule, historyEntry);
      await prisma.request.update({
        where: { id: request.id },
        data: { details: updatedDetails as Prisma.InputJsonValue }
      });
    }
  } else if (scheduleAlreadySent) {
    emailStatus = "SKIPPED";
  }

  revalidatePath("/admin/requests");
  revalidatePath("/requests");
  revalidatePath(`/requests/${request.id}`);
  revalidatePath("/calendar");

  if (!hasRequesterEmail) {
    return { status: "success", message: "Scheduled, but the requester email is missing." };
  }

  if (emailStatus && emailStatus !== "SENT") {
    if (emailStatus === "SKIPPED") {
      return { status: "success", message: "Email already sent." };
    }
    return { status: "success", message: "Scheduled, but the email failed to send." };
  }

  return { status: "success", message: "Schedule email sent." };
}

export async function cancelRequest(input: {
  requestId: string;
  note?: string;
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to perform this action." };
  }

  const parsed = requestEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.errors[0]?.message ?? "Invalid request." };
  }

  const parishId = session.user.activeParishId;
  await requireAdminOrShepherd(session.user.id, parishId);

  const request = await prisma.request.findUnique({
    where: { id: parsed.data.requestId },
    select: {
      id: true,
      parishId: true,
      status: true,
      title: true,
      type: true,
      details: true,
      createdByUserId: true,
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });

  if (!request || request.parishId !== parishId) {
    return { status: "error", message: "Request not found." };
  }

  if (request.status === "COMPLETED") {
    return { status: "error", message: "Completed requests cannot be canceled." };
  }

  const actorName = session.user.name ?? session.user.email ?? "Unknown";
  const details = parseRequestDetails(request.details);
  const scheduleEventId = details?.schedule?.eventId;
  if (scheduleEventId) {
    await prisma.event.delete({ where: { id: scheduleEventId } }).catch(() => null);
  }

  const { schedule: _schedule, ...detailsWithoutSchedule } = details ?? {};
  let updatedDetails = details ? detailsWithoutSchedule : undefined;
  if (updatedDetails) {
    updatedDetails = appendRequestActivity(updatedDetails, {
      occurredAt: new Date().toISOString(),
      type: "STATUS" as const,
      actorId: session.user.id,
      actorName,
      description: `Status changed to ${getRequestStatusLabel("CANCELED")}.`
    });
  }

  await prisma.request.update({
    where: { id: request.id },
    data: {
      status: "CANCELED",
      details: updatedDetails ? (updatedDetails as Prisma.InputJsonValue) : undefined
    }
  });

  // Notify the requester in-app that their request was canceled by admin
  if (request.createdByUserId && request.createdByUserId !== session.user.id) {
    notifyRequestStatusUpdatedInApp({
      requestId: request.id,
      requestTitle: request.title,
      parishId,
      requesterId: request.createdByUserId,
      status: "CANCELED"
    }).catch((error) => {
      console.error("[requests] Failed to create in-app cancellation notification:", error);
    });
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

  const requesterName = details?.requesterName ?? request.createdBy.name ?? null;
  const requesterEmail = details?.requesterEmail ?? request.createdBy.email;
  const hasRequesterEmail = Boolean(requesterEmail);
  let emailStatus: "SENT" | "FAILED" | "SKIPPED" | null = null;
  const payloadHash = hashEmailPayload({ action: "CANCEL" });
  const alreadySent = hasRequestEmailHistoryEntry(request.details, {
    type: "CANCEL",
    payloadHash
  });

  if (requesterEmail && !alreadySent) {
    const email = await sendRequestUnableToScheduleEmail({
      parishId,
      parishName: parish?.name ?? "Your parish",
      requestId: request.id,
      requestTitle: request.title,
      requestTypeLabel: getRequestTypeLabel(request.type),
      requester: {
        userId: request.createdBy.id,
        name: requesterName,
        email: requesterEmail,
        role: "MEMBER"
      },
      note: parsed.data.note
    });

    emailStatus = email.status;

    if (email.status === "SENT") {
      const historyEntry = {
        sentAt: new Date().toISOString(),
        type: "CANCEL" as const,
        template: "CANNOT_SCHEDULE" as const,
        subject: email.subject,
        note: parsed.data.note,
        sentByUserId: session.user.id,
        sentByName: actorName,
        payloadHash
      };
      const detailsWithHistory = appendRequestHistory(updatedDetails ?? request.details, historyEntry);
      await prisma.request.update({
        where: { id: request.id },
        data: { details: detailsWithHistory as Prisma.InputJsonValue }
      });
    }
  } else if (alreadySent) {
    emailStatus = "SKIPPED";
  }

  revalidatePath("/admin/requests");
  revalidatePath("/requests");
  revalidatePath(`/requests/${request.id}`);
  revalidatePath("/calendar");

  if (!hasRequesterEmail) {
    return { status: "success", message: "Request canceled, but the requester email is missing." };
  }

  if (emailStatus && emailStatus !== "SENT") {
    if (emailStatus === "SKIPPED") {
      return { status: "success", message: "Cancellation email already sent." };
    }
    return { status: "success", message: "Request canceled, but the email failed to send." };
  }

  return { status: "success", message: "Cancellation email sent." };
}

export async function respondToScheduledRequest(input: {
  requestId: string;
  response: "ACCEPT" | "REJECT";
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to perform this action." };
  }

  const parsed = requestResponseSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.errors[0]?.message ?? "Invalid response." };
  }

  const parishId = session.user.activeParishId;

  const request = await prisma.request.findUnique({
    where: { id: parsed.data.requestId },
    select: {
      id: true,
      parishId: true,
      title: true,
      type: true,
      status: true,
      details: true,
      createdByUserId: true,
      assignedToUserId: true,
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });

  if (!request || request.parishId !== parishId) {
    return { status: "error", message: "Request not found." };
  }

  if (request.createdByUserId !== session.user.id) {
    return { status: "error", message: "You can only respond to your own request." };
  }

  if (request.status !== "SCHEDULED") {
    return { status: "error", message: "This request is not scheduled." };
  }

  const details = parseRequestDetails(request.details);
  const scheduleEventId = details?.schedule?.eventId;
  const actorName = session.user.name ?? session.user.email ?? "Unknown";

  if (parsed.data.response === "ACCEPT" && details?.scheduleResponse?.status === "ACCEPTED") {
    return { status: "success", message: "Schedule already confirmed." };
  }

  if (parsed.data.response === "REJECT" && details?.scheduleResponse?.status === "REJECTED") {
    return { status: "success", message: "Proposed time already declined." };
  }

  if (!scheduleEventId && parsed.data.response === "ACCEPT") {
    return { status: "error", message: "Scheduling details are missing. Please check back soon." };
  }

  if (parsed.data.response === "ACCEPT") {
    if (scheduleEventId) {
      await prisma.eventRsvp.upsert({
        where: { eventId_userId: { eventId: scheduleEventId, userId: session.user.id } },
        update: { response: "YES" },
        create: { eventId: scheduleEventId, userId: session.user.id, response: "YES" }
      });
    }

    const detailsWithResponse = {
      ...(details ?? {}),
      scheduleResponse: {
        status: "ACCEPTED" as const,
        respondedAt: new Date().toISOString(),
        respondedByUserId: session.user.id,
        respondedByName: actorName
      }
    };
    const detailsWithActivity = appendRequestActivity(detailsWithResponse, {
      occurredAt: new Date().toISOString(),
      type: "RESPONSE" as const,
      actorId: session.user.id,
      actorName,
      description: "Requester confirmed the scheduled time."
    });
    await prisma.request.update({
      where: { id: request.id },
      data: { details: detailsWithActivity as Prisma.InputJsonValue }
    });

    revalidatePath("/requests");
    revalidatePath(`/requests/${request.id}`);
    revalidatePath("/calendar");

    return { status: "success", message: "Schedule confirmed." };
  }

  const { schedule: _schedule, ...detailsWithoutSchedule } = details ?? {};
  const detailsWithResponse = {
    ...(detailsWithoutSchedule ?? {}),
    scheduleResponse: {
      status: "REJECTED" as const,
      respondedAt: new Date().toISOString(),
      respondedByUserId: session.user.id,
      respondedByName: actorName
    }
  };
  let detailsWithActivity = appendRequestActivity(detailsWithResponse, {
    occurredAt: new Date().toISOString(),
    type: "RESPONSE" as const,
    actorId: session.user.id,
    actorName,
    description: "Requester declined the proposed time."
  });
  detailsWithActivity = appendRequestActivity(detailsWithActivity, {
    occurredAt: new Date().toISOString(),
    type: "STATUS" as const,
    actorId: session.user.id,
    actorName,
    description: `Status changed to ${getRequestStatusLabel("ACKNOWLEDGED")}.`
  });

  // Move back to ACKNOWLEDGED so admin can propose a new time
  await prisma.request.update({
    where: { id: request.id },
    data: {
      status: "ACKNOWLEDGED",
      details: detailsWithActivity as Prisma.InputJsonValue
    }
  });

  if (scheduleEventId) {
    await prisma.event.delete({ where: { id: scheduleEventId } }).catch(() => null);
  }

  // Notify the assigned admin/clergy about the rejection via push notification
  if (request.assignedToUserId) {
    try {
      await notifyRequestAssigned({
        requestId: request.id,
        requestTitle: `Declined: ${request.title}`,
        parishId,
        assigneeId: request.assignedToUserId
      });
    } catch (error) {
      console.error("Failed to send reject push notification to assignee", error);
    }
    notifyRequestAssignedInApp({
      requestId: request.id,
      requestTitle: `Declined: ${request.title}`,
      parishId,
      assigneeId: request.assignedToUserId
    }).catch((error) => {
      console.error("[requests] Failed to create in-app decline notification:", error);
    });
  }

  revalidatePath("/requests");
  revalidatePath(`/requests/${request.id}`);
  revalidatePath("/admin/requests");
  revalidatePath("/calendar");

  return { status: "success", message: "Proposed time declined. The parish will be notified." };
}

export async function cancelOwnRequest(input: {
  requestId: string;
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to perform this action." };
  }

  const parsed = requestEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.errors[0]?.message ?? "Invalid request." };
  }

  const parishId = session.user.activeParishId;

  const request = await prisma.request.findUnique({
    where: { id: parsed.data.requestId },
    select: {
      id: true,
      parishId: true,
      status: true,
      title: true,
      type: true,
      details: true,
      createdByUserId: true,
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });

  if (!request || request.parishId !== parishId) {
    return { status: "error", message: "Request not found." };
  }

  if (request.createdByUserId !== session.user.id) {
    return { status: "error", message: "You can only cancel your own request." };
  }

  if (request.status === "COMPLETED") {
    return { status: "error", message: "Completed requests cannot be canceled." };
  }

  const actorName = session.user.name ?? session.user.email ?? "Unknown";
  const details = parseRequestDetails(request.details);
  const scheduleEventId = details?.schedule?.eventId;
  if (scheduleEventId) {
    await prisma.event.delete({ where: { id: scheduleEventId } }).catch(() => null);
  }

  const { schedule: _schedule, ...detailsWithoutSchedule } = details ?? {};
  let updatedDetails = details ? detailsWithoutSchedule : undefined;
  if (updatedDetails) {
    updatedDetails = appendRequestActivity(updatedDetails, {
      occurredAt: new Date().toISOString(),
      type: "STATUS" as const,
      actorId: session.user.id,
      actorName,
      description: `Status changed to ${getRequestStatusLabel("CANCELED")}.`
    });
  }

  await prisma.request.update({
    where: { id: request.id },
    data: {
      status: "CANCELED",
      details: updatedDetails ? (updatedDetails as Prisma.InputJsonValue) : undefined
    }
  });

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

  const requesterName = details?.requesterName ?? request.createdBy.name ?? null;
  const requesterEmail = details?.requesterEmail ?? request.createdBy.email;
  const hasRequesterEmail = Boolean(requesterEmail);
  let emailStatus: "SENT" | "FAILED" | "SKIPPED" | null = null;
  const payloadHash = hashEmailPayload({ action: "CANCEL" });
  const alreadySent = hasRequestEmailHistoryEntry(request.details, {
    type: "CANCEL",
    payloadHash
  });

  if (requesterEmail && !alreadySent) {
    const email = await sendRequestCancellationEmail({
      parishId,
      parishName: parish?.name ?? "Your parish",
      requestId: request.id,
      requestTitle: request.title,
      requestTypeLabel: getRequestTypeLabel(request.type),
      requester: {
        userId: request.createdBy.id,
        name: requesterName,
        email: requesterEmail,
        role: "MEMBER"
      },
      note: "We received your cancellation. If you still need this, please call the office."
    });

    emailStatus = email.status;

    if (email.status === "SENT") {
      const historyEntry = {
        sentAt: new Date().toISOString(),
        type: "CANCEL" as const,
        template: "REQUESTER_CANCEL" as const,
        subject: email.subject,
        sentByUserId: session.user.id,
        sentByName: actorName,
        payloadHash
      };
      const detailsWithHistory = appendRequestHistory(updatedDetails ?? request.details, historyEntry);
      await prisma.request.update({
        where: { id: request.id },
        data: { details: detailsWithHistory as Prisma.InputJsonValue }
      });
    }
  } else if (alreadySent) {
    emailStatus = "SKIPPED";
  }

  revalidatePath("/requests");
  revalidatePath(`/requests/${request.id}`);
  revalidatePath("/admin/requests");
  revalidatePath("/calendar");

  if (!hasRequesterEmail) {
    return { status: "success", message: "Request canceled, but the requester email is missing." };
  }

  if (emailStatus && emailStatus !== "SENT") {
    if (emailStatus === "SKIPPED") {
      return { status: "success", message: "Cancellation email already sent." };
    }
    return { status: "success", message: "Request canceled, but the email failed to send." };
  }

  return { status: "success", message: "Request canceled." };
}
