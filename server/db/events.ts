import { prisma } from "@/server/db/prisma";

export async function listWeekEvents(parishId: string, weekId: string) {
  return prisma.event.findMany({
    where: {
      parishId,
      weekId,
      deletedAt: null
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true,
      summary: true,
      visibility: true,
      type: true,
      recurrenceFreq: true,
      recurrenceInterval: true,
      recurrenceByWeekday: true,
      recurrenceUntil: true,
      group: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
}

export async function createEvent(input: {
  parishId: string;
  weekId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  summary?: string | null;
  visibility?: "PUBLIC" | "GROUP" | "PRIVATE";
  groupId?: string | null;
  type?: "SERVICE" | "EVENT";
  recurrenceFreq?: "NONE" | "DAILY" | "WEEKLY";
  recurrenceInterval?: number;
  recurrenceByWeekday?: number[];
  recurrenceUntil?: Date | null;
}) {
  return prisma.event.create({
    data: {
      parishId: input.parishId,
      weekId: input.weekId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      summary: input.summary ?? null,
      visibility: input.visibility ?? "PUBLIC",
      groupId: input.groupId ?? null,
      type: input.type ?? "EVENT",
      recurrenceFreq: input.recurrenceFreq ?? "NONE",
      recurrenceInterval: input.recurrenceInterval ?? 1,
      recurrenceByWeekday: input.recurrenceByWeekday ?? [],
      recurrenceUntil: input.recurrenceUntil ?? null
    },
    select: {
      id: true
    }
  });
}
