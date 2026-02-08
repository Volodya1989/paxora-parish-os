"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { isParishLeader } from "@/lib/permissions";
import { getWeekEnd, getWeekLabel, getWeekStartMonday } from "@/lib/date/week";
import { createEventRequestSchema } from "@/lib/validation/eventRequests";
import { parseParishDateTime } from "@/lib/time/parish";
import {
  selectEventRequestAdminRecipients,
  sendEventRequestAdminNotificationEmail,
  sendEventRequestDecisionEmail,
  sendEventRequestSubmittedEmail
} from "@/lib/email/eventRequests";
import { getParishMembership } from "@/server/db/groups";

const HOUR_IN_MS = 60 * 60 * 1000;

type EventRequestResult = {
  status: "success" | "error";
  message?: string;
};

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

function parseStartsAt(date: string, time: string) {
  const startsAt = parseParishDateTime(date, time);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Enter a valid date and time.");
  }
  return startsAt;
}

function mapCategoryToEventType(category: "SERVICE" | "REHEARSAL" | "GATHERING" | "OTHER") {
  return category === "SERVICE" ? "SERVICE" : "EVENT";
}

export async function submitEventRequest(formData: FormData): Promise<EventRequestResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to submit a request." };
  }

  const parsed = createEventRequestSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    date: formData.get("date"),
    time: formData.get("time"),
    location: formData.get("location"),
    description: formData.get("description"),
    participants: formData.get("participants"),
    contactName: formData.get("contactName")
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.errors[0]?.message ?? "Invalid request." };
  }

  const { title, type, date, time, location, description, participants, contactName } = parsed.data;
  const participantCount = participants ? Number(participants) : null;

  if (participants && Number.isNaN(participantCount)) {
    return { status: "error", message: "Expected participants must be a number." };
  }

  let startsAt: Date;
  try {
    startsAt = parseStartsAt(date, time);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enter a valid date and time.";
    return { status: "error", message };
  }

  const parishId = session.user.activeParishId;
  const requesterId = session.user.id;

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { email: true, name: true }
  });

  if (!requester?.email) {
    return { status: "error", message: "A valid email is required to submit a request." };
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: { name: true }
  });

  if (!parish) {
    return { status: "error", message: "Parish not found." };
  }

  const endsAt = new Date(startsAt.getTime() + HOUR_IN_MS);

  const request = await prisma.eventRequest.create({
    data: {
      parishId,
      requesterId,
      contactName,
      title,
      category: type,
      startsAt,
      endsAt,
      location,
      description,
      participants: participantCount,
      status: "PENDING"
    }
  });

  const dateTimeLabel = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(startsAt);

  try {
    await sendEventRequestSubmittedEmail({
      parishId,
      parishName: parish.name,
      requesterId,
      requesterEmail: requester.email,
      requesterName: requester.name ?? contactName,
      eventTitle: title,
      eventDateTime: dateTimeLabel
    });
  } catch (error) {
    console.error("Failed to send event request confirmation email", error);
  }

  const adminMemberships = await prisma.membership.findMany({
    where: {
      parishId,
      role: { in: ["ADMIN", "SHEPHERD"] }
    },
    select: {
      userId: true,
      notifyEmailEnabled: true,
      user: {
        select: {
          email: true,
          name: true
        }
      }
    }
  });

  const groupMemberships = await prisma.groupMembership.findMany({
    where: {
      userId: requesterId,
      status: "ACTIVE",
      group: { parishId }
    },
    select: {
      groupId: true,
      group: { select: { name: true } }
    }
  });

  const groupIds = groupMemberships.map((membership) => membership.groupId);

  const groupCoordinators = groupIds.length
    ? await prisma.groupMembership.findMany({
        where: {
          groupId: { in: groupIds },
          role: "COORDINATOR",
          status: "ACTIVE"
        },
        select: {
          userId: true,
          group: { select: { name: true } },
          user: {
            select: {
              email: true,
              name: true,
              memberships: {
                where: { parishId },
                select: { notifyEmailEnabled: true }
              }
            }
          }
        }
      })
    : [];

  const coordinatorRecipients = groupCoordinators.map((membership) => ({
    userId: membership.userId,
    email: membership.user.email ?? "",
    name: membership.user.name,
    notifyEmailEnabled: membership.user.memberships[0]?.notifyEmailEnabled ?? true,
    groupNames: membership.group?.name ? [membership.group.name] : []
  }));

  const adminRecipients = adminMemberships.map((membership) => ({
    userId: membership.userId,
    email: membership.user.email ?? "",
    name: membership.user.name,
    notifyEmailEnabled: membership.notifyEmailEnabled
  }));

  const recipients = selectEventRequestAdminRecipients([
    ...adminRecipients,
    ...coordinatorRecipients
  ]);

  await Promise.all(
    recipients.map(async (admin) => {
      try {
        await sendEventRequestAdminNotificationEmail({
          parishId,
          parishName: parish.name,
          requesterId,
          requesterEmail: requester.email,
          requesterName: requester.name ?? contactName,
          admin,
          eventTitle: title,
          eventDateTime: dateTimeLabel,
          location
        });
      } catch (error) {
        console.error("Failed to send event request admin notification", error);
      }
    })
  );

  revalidatePath("/calendar");

  return { status: "success" };
}

export async function approveEventRequest({ requestId }: { requestId: string }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const membership = await getParishMembership(parishId, session.user.id);

  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Unauthorized");
  }

  const request = await prisma.eventRequest.findUnique({
    where: { id: requestId },
    include: {
      parish: { select: { name: true } },
      requester: { select: { id: true, name: true, email: true } }
    }
  });

  if (!request || request.parishId !== parishId) {
    throw new Error("Request not found.");
  }

  if (request.status !== "PENDING") {
    throw new Error("Request is not pending.");
  }

  const week = await getOrCreateWeekForDate(parishId, request.startsAt);
  const eventType = mapCategoryToEventType(request.category);

  const createdEvent = await prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        parishId,
        weekId: week.id,
        title: request.title,
        startsAt: request.startsAt,
        endsAt: request.endsAt,
        location: request.location ?? null,
        summary: request.description ?? null,
        visibility: "PUBLIC",
        type: eventType
      },
      select: { id: true }
    });

    await tx.eventRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        decidedAt: new Date(),
        decidedByUserId: session.user.id,
        eventId: event.id
      }
    });

    return event;
  });

  const dateTimeLabel = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(request.startsAt);

  if (request.requester.email) {
    try {
      await sendEventRequestDecisionEmail({
        parishId,
        parishName: request.parish.name,
        requesterId: request.requester.id,
        requesterEmail: request.requester.email,
        requesterName: request.requester.name ?? request.contactName,
        decision: "APPROVED",
        eventTitle: request.title,
        eventDateTime: dateTimeLabel
      });
    } catch (error) {
      console.error("Failed to send event request approval email", error);
    }
  }

  revalidatePath("/calendar");
  return createdEvent;
}

export async function rejectEventRequest({ requestId }: { requestId: string }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const membership = await getParishMembership(parishId, session.user.id);

  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Unauthorized");
  }

  const request = await prisma.eventRequest.findUnique({
    where: { id: requestId },
    include: {
      parish: { select: { name: true } },
      requester: { select: { id: true, name: true, email: true } }
    }
  });

  if (!request || request.parishId !== parishId) {
    throw new Error("Request not found.");
  }

  if (request.status !== "PENDING") {
    throw new Error("Request is not pending.");
  }

  await prisma.eventRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      decidedAt: new Date(),
      decidedByUserId: session.user.id
    }
  });

  const dateTimeLabel = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(request.startsAt);

  if (request.requester.email) {
    try {
      await sendEventRequestDecisionEmail({
        parishId,
        parishName: request.parish.name,
        requesterId: request.requester.id,
        requesterEmail: request.requester.email,
        requesterName: request.requester.name ?? request.contactName,
        decision: "REJECTED",
        eventTitle: request.title,
        eventDateTime: dateTimeLabel
      });
    } catch (error) {
      console.error("Failed to send event request rejection email", error);
    }
  }

  revalidatePath("/calendar");
}
