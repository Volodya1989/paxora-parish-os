"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
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
import { getDefaultVisibilityForType, getRequestTypeLabel } from "@/lib/requests/utils";
import { sendRequestAssignmentEmail } from "@/lib/email/requestNotifications";
import { notifyRequestAssigned } from "@/lib/push/notify";
import { getWeekEnd, getWeekLabel, getWeekStartMonday } from "@/lib/date/week";
import {
  appendRequestHistory,
  parseRequestDetails
} from "@/lib/requests/details";
import {
  sendRequestCancellationEmail,
  sendRequestInfoEmail,
  sendRequestScheduleEmail,
  sendRequestUnableToScheduleEmail
} from "@/lib/email/requesterRequests";

export type RequestActionResult = { status: "success" | "error"; message?: string };

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

  const updated = await prisma.request.updateMany({
    where: { id: input.requestId, parishId },
    data: { status: input.status }
  });

  if (!updated.count) {
    return { status: "error", message: "Request not found." };
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
    select: { assignedToUserId: true, parishId: true, status: true }
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

  await prisma.request.update({
    where: { id: input.requestId },
    data: { visibilityScope: input.visibilityScope }
  });

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
      assignedToUserId: true
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

  await prisma.request.update({
    where: { id: input.requestId },
    data: { assignedToUserId: input.assigneeId }
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
    const historyEntry = {
      sentAt: new Date().toISOString(),
      template: "NEED_INFO" as const,
      subject: email.subject,
      note: parsed.data.note
    };
    const updatedDetails = appendRequestHistory(request.details, historyEntry);
    await prisma.request.update({
      where: { id: request.id },
      data: { details: updatedDetails }
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

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.startTime}`);
  const endsAt = new Date(`${parsed.data.date}T${parsed.data.endTime}`);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { status: "error", message: "Enter a valid date and time." };
  }

  if (endsAt <= startsAt) {
    return { status: "error", message: "End time must be after the start time." };
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

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

  if (request.assignedToUserId) {
    await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId: event.id, userId: request.assignedToUserId } },
      update: { response: "YES" },
      create: { eventId: event.id, userId: request.assignedToUserId, response: "YES" }
    });
  }

  const details = parseRequestDetails(request.details) ?? {};
  const detailsWithSchedule = {
    ...details,
    schedule: {
      eventId: event.id,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString()
    }
  };

  await prisma.request.update({
    where: { id: request.id },
    data: {
      status: "SCHEDULED",
      details: detailsWithSchedule
    }
  });

  const requesterName = details.requesterName ?? request.createdBy.name ?? null;
  const requesterEmail = details.requesterEmail ?? request.createdBy.email;
  const hasRequesterEmail = Boolean(requesterEmail);
  let emailStatus: "SENT" | "FAILED" | "SKIPPED" | null = null;

  if (requesterEmail) {
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
        template: "SCHEDULE" as const,
        subject: email.subject,
        note: parsed.data.note
      };
      const updatedDetails = appendRequestHistory(detailsWithSchedule, historyEntry);
      await prisma.request.update({
        where: { id: request.id },
        data: { details: updatedDetails }
      });
    }
  }

  revalidatePath("/admin/requests");
  revalidatePath("/requests");
  revalidatePath("/calendar");

  if (!hasRequesterEmail) {
    return { status: "success", message: "Scheduled, but the requester email is missing." };
  }

  if (emailStatus && emailStatus !== "SENT") {
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

  const details = parseRequestDetails(request.details);
  const scheduleEventId = details?.schedule?.eventId;
  if (scheduleEventId) {
    await prisma.event.delete({ where: { id: scheduleEventId } }).catch(() => null);
  }

  const { schedule: _schedule, ...detailsWithoutSchedule } = details ?? {};

  await prisma.request.update({
    where: { id: request.id },
    data: { status: "CANCELED", details: details ? detailsWithoutSchedule : request.details }
  });

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

  const requesterName = details?.requesterName ?? request.createdBy.name ?? null;
  const requesterEmail = details?.requesterEmail ?? request.createdBy.email;
  const hasRequesterEmail = Boolean(requesterEmail);
  let emailStatus: "SENT" | "FAILED" | "SKIPPED" | null = null;

  if (requesterEmail) {
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
        template: "CANNOT_SCHEDULE" as const,
        subject: email.subject,
        note: parsed.data.note
      };
      const updatedDetails = appendRequestHistory(request.details, historyEntry);
      await prisma.request.update({
        where: { id: request.id },
        data: { details: updatedDetails }
      });
    }
  }

  revalidatePath("/admin/requests");
  revalidatePath("/requests");
  revalidatePath("/calendar");

  if (!hasRequesterEmail) {
    return { status: "success", message: "Request canceled, but the requester email is missing." };
  }

  if (emailStatus && emailStatus !== "SENT") {
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

  if (!scheduleEventId) {
    return { status: "error", message: "This request is not scheduled yet." };
  }

  if (parsed.data.response === "ACCEPT") {
    await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId: scheduleEventId, userId: session.user.id } },
      update: { response: "YES" },
      create: { eventId: scheduleEventId, userId: session.user.id, response: "YES" }
    });

    revalidatePath("/requests");
    revalidatePath(`/requests/${request.id}`);
    revalidatePath("/calendar");

    return { status: "success", message: "Schedule confirmed." };
  }

  const { schedule: _schedule, ...detailsWithoutSchedule } = details ?? {};

  await prisma.request.update({
    where: { id: request.id },
    data: { status: "CANCELED", details: details ? detailsWithoutSchedule : request.details }
  });

  await prisma.event.delete({ where: { id: scheduleEventId } }).catch(() => null);

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

  const requesterName = details?.requesterName ?? request.createdBy.name ?? null;
  const requesterEmail = details?.requesterEmail ?? request.createdBy.email;
  const hasRequesterEmail = Boolean(requesterEmail);
  let emailStatus: "SENT" | "FAILED" | "SKIPPED" | null = null;

  if (requesterEmail) {
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
        template: "REQUESTER_REJECT" as const,
        subject: email.subject
      };
      const updatedDetails = appendRequestHistory(request.details, historyEntry);
      await prisma.request.update({
        where: { id: request.id },
        data: { details: updatedDetails }
      });
    }
  }

  revalidatePath("/requests");
  revalidatePath(`/requests/${request.id}`);
  revalidatePath("/admin/requests");
  revalidatePath("/calendar");

  if (!hasRequesterEmail) {
    return { status: "success", message: "Request canceled, but the requester email is missing." };
  }

  if (emailStatus && emailStatus !== "SENT") {
    return { status: "success", message: "Request canceled, but the email failed to send." };
  }

  return { status: "success", message: "Request canceled." };
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

  const details = parseRequestDetails(request.details);
  const scheduleEventId = details?.schedule?.eventId;
  if (scheduleEventId) {
    await prisma.event.delete({ where: { id: scheduleEventId } }).catch(() => null);
  }

  const { schedule: _schedule, ...detailsWithoutSchedule } = details ?? {};

  await prisma.request.update({
    where: { id: request.id },
    data: { status: "CANCELED", details: details ? detailsWithoutSchedule : request.details }
  });

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

  const requesterName = details?.requesterName ?? request.createdBy.name ?? null;
  const requesterEmail = details?.requesterEmail ?? request.createdBy.email;
  const hasRequesterEmail = Boolean(requesterEmail);
  let emailStatus: "SENT" | "FAILED" | "SKIPPED" | null = null;

  if (requesterEmail) {
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
        template: "REQUESTER_CANCEL" as const,
        subject: email.subject
      };
      const updatedDetails = appendRequestHistory(request.details, historyEntry);
      await prisma.request.update({
        where: { id: request.id },
        data: { details: updatedDetails }
      });
    }
  }

  revalidatePath("/requests");
  revalidatePath(`/requests/${request.id}`);
  revalidatePath("/admin/requests");
  revalidatePath("/calendar");

  if (!hasRequesterEmail) {
    return { status: "success", message: "Request canceled, but the requester email is missing." };
  }

  if (emailStatus && emailStatus !== "SENT") {
    return { status: "success", message: "Request canceled, but the email failed to send." };
  }

  return { status: "success", message: "Request canceled." };
}
