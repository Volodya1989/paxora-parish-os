"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { getWeekForSelection, type WeekSelection } from "@/domain/week";
import { getWeekEnd, getWeekLabel, getWeekStartMonday } from "@/lib/date/week";
import { isParishLeader } from "@/lib/permissions";
import { createEventSchema, updateEventSchema } from "@/lib/validation/events";
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
  }).catch(() => {});

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

  const existing = await prisma.event.findFirst({
    where: {
      id: parsed.data.eventId,
      parishId
    },
    select: {
      id: true,
      groupId: true,
      visibility: true,
      startsAt: true
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

  const week = await getOrCreateWeekForDate(parishId, startsAt);

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

  revalidatePath("/calendar");
  revalidatePath(`/events/${existing.id}`);

  return {
    status: "success",
    message: "Event updated."
  };
}

export async function deleteEvent(
  _: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const eventId = formData.get("eventId");

  if (typeof eventId !== "string" || eventId.trim().length === 0) {
    return { status: "error", message: "Event not found." };
  }

  const membership = await requireParishMembership(userId, parishId);
  const isLeader = isParishLeader(membership.role);

  const existing = await prisma.event.findFirst({
    where: {
      id: eventId,
      parishId
    },
    select: {
      id: true,
      groupId: true
    }
  });

  if (!existing) {
    return { status: "error", message: "Event not found." };
  }

  const existingMembership = existing.groupId
    ? await getGroupMembership(existing.groupId, userId)
    : null;
  const canManageExisting =
    isLeader || (existingMembership?.status === "ACTIVE" && Boolean(existingMembership));

  if (!canManageExisting) {
    return {
      status: "error",
      message: "You do not have permission to delete this event."
    };
  }

  await prisma.event.delete({
    where: { id: existing.id }
  });

  revalidatePath("/calendar");
  revalidatePath(`/events/${existing.id}`);

  return {
    status: "success",
    message: "Event removed."
  };
}
