"use server";

import { getServerSession, type Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { getWeekForSelection, type WeekSelection } from "@/domain/week";
import { createEventSchema } from "@/lib/validation/events";
import {
  createEvent as createEventRecord,
  listWeekEvents as listWeekEventsData
} from "@/server/db/events";
import { getParishMembership } from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";

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
    canCreate: membership.role === "ADMIN" || membership.role === "SHEPHERD"
  };
}

export async function createEvent(formData: FormData) {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertSession(session);

  const parsed = createEventSchema.safeParse({
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
    weekId: formData.get("weekId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const membership = await requireParishMembership(userId, parishId);
  const canCreate = membership.role === "ADMIN" || membership.role === "SHEPHERD";

  if (!canCreate) {
    throw new Error("Forbidden");
  }

  const week = await prisma.week.findFirst({
    where: {
      id: parsed.data.weekId,
      parishId
    },
    select: {
      id: true,
      startsOn: true,
      endsOn: true
    }
  });

  if (!week) {
    throw new Error("Not found");
  }

  const { startsAt, endsAt } = parsed.data;

  if (startsAt < week.startsOn || endsAt > week.endsOn || endsAt <= startsAt) {
    throw new Error("Event must be scheduled within the selected week.");
  }

  await createEventRecord({
    parishId,
    weekId: week.id,
    title: parsed.data.title,
    startsAt,
    endsAt,
    location: parsed.data.location
  });

  revalidatePath("/calendar");
  revalidatePath("/this-week");
}
