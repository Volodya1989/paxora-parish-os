"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { getWeekForSelection, type WeekSelection } from "@/domain/week";
import { getWeekEnd, getWeekLabel, getWeekStartMonday } from "@/lib/date/week";
import { isParishLeader } from "@/lib/permissions";
import { createEventSchema, deleteEventSchema, updateEventSchema } from "@/lib/validation/events";
import { parseParishDateTime } from "@/lib/time/parish";
import {
  createEvent as createEventRecord,
  listWeekEvents as listWeekEventsData
} from "@/server/db/events";
import { getGroupMembership, getParishMembership } from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";
import type { EventActionState } from "@/server/actions/eventState";
import { notifyEventCreated } from "@/lib/push/notify";
import { notifyEventCreatedInApp } from "@/lib/notifications/notify";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "@/lib/audit/actions";
import { auditLog } from "@/lib/audit/log";

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

async function resolveGroup(
  parishId: string,
  groupId?: string | null
): Promise<{ id: string; name: string } | null> {
  if (!groupId) {
    return null;
  }

  return prisma.group.findFirst({
    where: {
      id: groupId,
      parishId
    },
    select: {
      id: true,
      name: true
    }
  });
}

function resolveRecurrence(input: {
  recurrenceFreq: "NONE" | "DAILY" | "WEEKLY";
  recurrenceInterval?: number;
  recurrenceByWeekday: number[];
  recurrenceUntil?: string;
  startsAt: Date;
}) {
  const interval = input.recurrenceInterval ?? 1;
  const recurrenceFreq = input.recurrenceFreq ?? "NONE";
  let recurrenceByWeekday = input.recurrenceByWeekday ?? [];
  let recurrenceUntil: Date | null = null;

  if (input.recurrenceUntil) {
    const parsedUntil = parseParishDateTime(input.recurrenceUntil, "23:59:59");
    if (Number.isNaN(parsedUntil.getTime())) {
      throw new Error("Enter a valid recurrence end date.");
    }
    recurrenceUntil = parsedUntil;
  }

  if (recurrenceFreq === "NONE") {
    recurrenceByWeekday = [];
    recurrenceUntil = null;
  }

  if (recurrenceFreq === "DAILY") {
    recurrenceByWeekday = [];
  }

  if (recurrenceFreq === "WEEKLY" && recurrenceByWeekday.length === 0) {
    recurrenceByWeekday = [input.startsAt.getDay()];
  }

  if (recurrenceUntil && recurrenceUntil < input.startsAt) {
    throw new Error("Recurrence end date must be after the event start date.");
  }

  return {
    recurrenceFreq,
    recurrenceInterval: interval,
    recurrenceByWeekday,
    recurrenceUntil
  };
}

type EventScope = "THIS_EVENT" | "THIS_SERIES";

function parseOccurrenceStartsAt(value: string | null | undefined): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function listWeekEvents(weekSelection: WeekSelection = "current") {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const membership = await requireParishMembership(userId, parishId);
  const week = await getWeekForSelection(parishId, weekSelection);

  const events = await listWeekEventsData(parishId, week.id);

  return {
    week: {
      id: week.id,
      label: week.label,
      startsOn: week.startsOn,
      endsOn: week.endsOn
    },
    events,
    canCreate: isParishLeader(membership.role)
  };
}

export async function createEvent(
  _: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = createEventSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location"),
    summary: formData.get("summary"),
    visibility: formData.get("visibility"),
    groupId: formData.get("groupId"),
    type: formData.get("type"),
    recurrenceFreq: formData.get("recurrenceFreq"),
    recurrenceInterval: formData.get("recurrenceInterval"),
    recurrenceByWeekday: formData.get("recurrenceByWeekday"),
    recurrenceUntil: formData.get("recurrenceUntil")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.errors[0]?.message ?? "Invalid input"
    };
  }

  const membership = await requireParishMembership(userId, parishId);
  const isLeader = isParishLeader(membership.role);

  if (parsed.data.visibility === "GROUP" && !parsed.data.groupId) {
    return { status: "error", message: "Choose a group for group-only events." };
  }

  const group = await resolveGroup(parishId, parsed.data.groupId);

  if (parsed.data.visibility === "GROUP" && !group) {
    return { status: "error", message: "That group is no longer available." };
  }

  const startsAt = parseParishDateTime(parsed.data.date, parsed.data.startTime);
  const endsAt = parseParishDateTime(parsed.data.date, parsed.data.endTime);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return {
      status: "error",
      message: "Enter a valid start and end time."
    };
  }

  if (endsAt <= startsAt) {
    return {
      status: "error",
      message: "End time must be after the start time."
    };
  }

  let recurrence;
  try {
    recurrence = resolveRecurrence({
      recurrenceFreq: parsed.data.recurrenceFreq,
      recurrenceInterval: parsed.data.recurrenceInterval,
      recurrenceByWeekday: parsed.data.recurrenceByWeekday,
      recurrenceUntil: parsed.data.recurrenceUntil,
      startsAt
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Invalid recurrence settings."
    };
  }

  if (parsed.data.visibility === "GROUP") {
    const groupMembership = group?.id
      ? await getGroupMembership(group.id, userId)
      : null;
    if (!isLeader && groupMembership?.status !== "ACTIVE") {
      return {
        status: "error",
        message: "You must belong to the selected group to create this event."
      };
    }
  } else if (!isLeader) {
    return {
      status: "error",
      message: "You do not have permission to create public events."
    };
  }

  const week = await getOrCreateWeekForDate(parishId, startsAt);

  const createdEvent = await createEventRecord({
    parishId,
    weekId: week.id,
    title: parsed.data.title,
    startsAt,
    endsAt,
    location: parsed.data.location,
    summary: parsed.data.summary ?? null,
    visibility: parsed.data.visibility,
    groupId: parsed.data.visibility === "GROUP" ? group?.id ?? null : null,
    type: parsed.data.type,
    recurrenceFreq: recurrence.recurrenceFreq,
    recurrenceInterval: recurrence.recurrenceInterval,
    recurrenceByWeekday: recurrence.recurrenceByWeekday,
    recurrenceUntil: recurrence.recurrenceUntil
  });

  // Fire-and-forget push notification
  notifyEventCreated({
    eventId: createdEvent.id,
    eventTitle: parsed.data.title,
    parishId,
    creatorId: userId,
    visibility: parsed.data.visibility,
    groupId: parsed.data.visibility === "GROUP" ? group?.id : null
  }).catch(() => {});
  notifyEventCreatedInApp({
    eventId: createdEvent.id,
    eventTitle: parsed.data.title,
    parishId,
    creatorId: userId,
    visibility: parsed.data.visibility,
    groupId: parsed.data.visibility === "GROUP" ? group?.id : null
  }).catch((error) => {
    console.error("[events] Failed to create in-app notification:", error);
  });

  revalidatePath("/calendar");
  revalidatePath("/this-week");

  return {
    status: "success",
    message: "Event scheduled."
  };
}

export async function updateEvent(
  _: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = updateEventSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location"),
    summary: formData.get("summary"),
    visibility: formData.get("visibility"),
    groupId: formData.get("groupId"),
    type: formData.get("type"),
    recurrenceFreq: formData.get("recurrenceFreq"),
    recurrenceInterval: formData.get("recurrenceInterval"),
    recurrenceByWeekday: formData.get("recurrenceByWeekday"),
    recurrenceUntil: formData.get("recurrenceUntil"),
    scope: formData.get("scope"),
    occurrenceStartsAt: formData.get("occurrenceStartsAt")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.errors[0]?.message ?? "Invalid input"
    };
  }

  const membership = await requireParishMembership(userId, parishId);
  const isLeader = isParishLeader(membership.role);

  const existing = await prisma.event.findFirst({
    where: {
      id: parsed.data.eventId,
      parishId,
      deletedAt: null
    },
    select: {
      id: true,
      groupId: true,
      visibility: true,
      startsAt: true,
      recurrenceFreq: true,
      recurrenceParentId: true,
      recurrenceOriginalStartsAt: true
    }
  });

  if (!existing) {
    return { status: "error", message: "Event not found." };
  }

  const group = await resolveGroup(parishId, parsed.data.groupId);

  if (parsed.data.visibility === "GROUP" && !group) {
    return { status: "error", message: "That group is no longer available." };
  }

  const existingMembership = existing.groupId
    ? await getGroupMembership(existing.groupId, userId)
    : null;
  const canManageExisting =
    isLeader || (existingMembership?.status === "ACTIVE" && Boolean(existingMembership));

  if (!canManageExisting) {
    return {
      status: "error",
      message: "You do not have permission to edit this event."
    };
  }

  if (parsed.data.visibility !== "GROUP" && !isLeader) {
    return {
      status: "error",
      message: "Only parish leaders can publish public or private events."
    };
  }

  if (parsed.data.visibility === "GROUP") {
    const groupMembership = group?.id
      ? await getGroupMembership(group.id, userId)
      : null;
    if (!isLeader && groupMembership?.status !== "ACTIVE") {
      return {
        status: "error",
        message: "You must belong to the selected group to use group visibility."
      };
    }
  }

  const startsAt = parseParishDateTime(parsed.data.date, parsed.data.startTime);
  const endsAt = parseParishDateTime(parsed.data.date, parsed.data.endTime);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return {
      status: "error",
      message: "Enter a valid start and end time."
    };
  }

  if (endsAt <= startsAt) {
    return {
      status: "error",
      message: "End time must be after the start time."
    };
  }

  let recurrence;
  try {
    recurrence = resolveRecurrence({
      recurrenceFreq: parsed.data.recurrenceFreq,
      recurrenceInterval: parsed.data.recurrenceInterval,
      recurrenceByWeekday: parsed.data.recurrenceByWeekday,
      recurrenceUntil: parsed.data.recurrenceUntil,
      startsAt
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Invalid recurrence settings."
    };
  }

  const scope: EventScope = parsed.data.scope;
  const baseEventId = existing.recurrenceParentId ?? existing.id;
  const isRecurringSeries = existing.recurrenceFreq !== "NONE" || Boolean(existing.recurrenceParentId);
  const occurrenceStartsAt = parseOccurrenceStartsAt(parsed.data.occurrenceStartsAt);

  const week = await getOrCreateWeekForDate(parishId, startsAt);

  if (scope === "THIS_SERIES" && isRecurringSeries) {
    await prisma.event.update({
      where: { id: baseEventId },
      data: {
        title: parsed.data.title,
        startsAt,
        endsAt,
        location: parsed.data.location,
        summary: parsed.data.summary ?? null,
        visibility: parsed.data.visibility,
        groupId: parsed.data.visibility === "GROUP" ? group?.id ?? null : null,
        type: parsed.data.type,
        recurrenceFreq: recurrence.recurrenceFreq,
        recurrenceInterval: recurrence.recurrenceInterval,
        recurrenceByWeekday: recurrence.recurrenceByWeekday,
        recurrenceUntil: recurrence.recurrenceUntil,
        weekId: week.id
      }
    });
  } else if (existing.recurrenceParentId && scope === "THIS_EVENT") {
    await prisma.event.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        startsAt,
        endsAt,
        location: parsed.data.location,
        summary: parsed.data.summary ?? null,
        visibility: parsed.data.visibility,
        groupId: parsed.data.visibility === "GROUP" ? group?.id ?? null : null,
        type: parsed.data.type,
        recurrenceFreq: "NONE",
        recurrenceInterval: 1,
        recurrenceByWeekday: [],
        recurrenceUntil: null,
        weekId: week.id
      }
    });
  } else if (existing.recurrenceFreq !== "NONE" && scope === "THIS_EVENT") {
    const targetOccurrenceStartsAt = occurrenceStartsAt ?? existing.startsAt;
    await prisma.$transaction(async (tx) => {
      await tx.eventRecurrenceException.upsert({
        where: {
          eventId_occurrenceStartsAt: {
            eventId: baseEventId,
            occurrenceStartsAt: targetOccurrenceStartsAt
          }
        },
        create: {
          eventId: baseEventId,
          occurrenceStartsAt: targetOccurrenceStartsAt
        },
        update: {}
      });

      const existingOverride = await tx.event.findFirst({
        where: {
          recurrenceParentId: baseEventId,
          recurrenceOriginalStartsAt: targetOccurrenceStartsAt,
          deletedAt: null
        },
        select: { id: true }
      });

      const overrideData = {
        parishId,
        weekId: week.id,
        title: parsed.data.title,
        startsAt,
        endsAt,
        location: parsed.data.location,
        summary: parsed.data.summary ?? null,
        visibility: parsed.data.visibility,
        groupId: parsed.data.visibility === "GROUP" ? group?.id ?? null : null,
        type: parsed.data.type,
        recurrenceFreq: "NONE" as const,
        recurrenceInterval: 1,
        recurrenceByWeekday: [],
        recurrenceUntil: null,
        recurrenceParentId: baseEventId,
        recurrenceOriginalStartsAt: targetOccurrenceStartsAt
      };

      if (existingOverride) {
        await tx.event.update({ where: { id: existingOverride.id }, data: overrideData });
      } else {
        await tx.event.create({ data: overrideData });
      }
    });
  } else {
    await prisma.event.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        startsAt,
        endsAt,
        location: parsed.data.location,
        summary: parsed.data.summary ?? null,
        visibility: parsed.data.visibility,
        groupId: parsed.data.visibility === "GROUP" ? group?.id ?? null : null,
        type: parsed.data.type,
        recurrenceFreq: recurrence.recurrenceFreq,
        recurrenceInterval: recurrence.recurrenceInterval,
        recurrenceByWeekday: recurrence.recurrenceByWeekday,
        recurrenceUntil: recurrence.recurrenceUntil,
        weekId: week.id
      }
    });
  }

  revalidatePath("/calendar");
  revalidatePath(`/events/${existing.id}`);

  return {
    status: "success",
    message: "Event updated."
  };
}

type EventDeleteAuthorizationInput = {
  eventId: string;
  parishId: string;
  userId: string;
  userRole: "ADMIN" | "SHEPHERD" | "MEMBER";
};

export async function resolveEventDeleteAuthorization({
  eventId,
  parishId,
  userId,
  userRole
}: EventDeleteAuthorizationInput): Promise<
  | { status: "not_found" }
  | { status: "forbidden" }
  | {
      status: "authorized";
      event: {
        id: string;
        title: string;
        startsAt: Date;
        recurrenceFreq: "NONE" | "DAILY" | "WEEKLY";
        recurrenceParentId: string | null;
      };
    }
> {
  const existing = await prisma.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null
    },
    select: {
      id: true,
      parishId: true,
      groupId: true,
      title: true,
      startsAt: true,
      recurrenceFreq: true,
      recurrenceParentId: true
    }
  });

  if (!existing || existing.parishId !== parishId) {
    return { status: "not_found" };
  }

  if (isParishLeader(userRole)) {
    return {
      status: "authorized",
      event: {
        id: existing.id,
        title: existing.title,
        startsAt: existing.startsAt,
        recurrenceFreq: existing.recurrenceFreq,
        recurrenceParentId: existing.recurrenceParentId
      }
    };
  }

  const existingMembership = existing.groupId
    ? await getGroupMembership(existing.groupId, userId)
    : null;
  const isGroupMember = existingMembership?.status === "ACTIVE";

  if (!isGroupMember) {
    return { status: "forbidden" };
  }

  return {
    status: "authorized",
    event: {
      id: existing.id,
      title: existing.title,
      startsAt: existing.startsAt,
      recurrenceFreq: existing.recurrenceFreq,
      recurrenceParentId: existing.recurrenceParentId
    }
  };
}

export async function deleteEvent(
  _: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = deleteEventSchema.safeParse({
    eventId: formData.get("eventId"),
    scope: formData.get("scope"),
    occurrenceStartsAt: formData.get("occurrenceStartsAt")
  });

  if (!parsed.success) {
    return { status: "error", message: "Event not found." };
  }

  const membership = await requireParishMembership(userId, parishId);

  const authorization = await resolveEventDeleteAuthorization({
    eventId: parsed.data.eventId,
    parishId,
    userId,
    userRole: membership.role
  });

  if (authorization.status === "not_found") {
    return { status: "error", message: "Event not found." };
  }

  if (authorization.status === "forbidden") {
    return {
      status: "error",
      message: "You do not have permission to delete this event."
    };
  }

  const scope: EventScope = parsed.data.scope;
  const baseEventId = authorization.event.recurrenceParentId ?? authorization.event.id;
  const occurrenceStartsAt = parseOccurrenceStartsAt(parsed.data.occurrenceStartsAt);
  const isRecurringSeries =
    authorization.event.recurrenceFreq !== "NONE" || Boolean(authorization.event.recurrenceParentId);

  await prisma.$transaction(async (tx) => {
    if (scope === "THIS_SERIES" && isRecurringSeries) {
      await tx.event.updateMany({
        where: {
          OR: [{ id: baseEventId }, { recurrenceParentId: baseEventId }],
          deletedAt: null
        },
        data: { deletedAt: new Date() }
      });
    } else if (authorization.event.recurrenceParentId && scope === "THIS_EVENT") {
      await tx.event.update({
        where: { id: authorization.event.id },
        data: { deletedAt: new Date() }
      });
    } else if (authorization.event.recurrenceFreq !== "NONE" && scope === "THIS_EVENT") {
      await tx.eventRecurrenceException.upsert({
        where: {
          eventId_occurrenceStartsAt: {
            eventId: baseEventId,
            occurrenceStartsAt: occurrenceStartsAt ?? authorization.event.startsAt
          }
        },
        create: {
          eventId: baseEventId,
          occurrenceStartsAt: occurrenceStartsAt ?? authorization.event.startsAt
        },
        update: {}
      });
    } else {
      await tx.event.update({
        where: { id: authorization.event.id },
        data: { deletedAt: new Date() }
      });
    }

    await auditLog(tx, {
      parishId,
      actorUserId: userId,
      action: AUDIT_ACTIONS.EVENT_DELETED,
      targetType: AUDIT_TARGET_TYPES.EVENT,
      targetId: authorization.event.id,
      metadata: {
        title: authorization.event.title,
        startsAt: authorization.event.startsAt.toISOString()
      }
    });
  });

  revalidatePath("/calendar");
  revalidatePath(`/events/${authorization.event.id}`);

  return {
    status: "success",
    message: "Event removed."
  };
}
