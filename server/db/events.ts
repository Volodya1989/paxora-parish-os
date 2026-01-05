import { prisma } from "@/server/db/prisma";

export async function listWeekEvents(parishId: string, weekId: string) {
  return prisma.event.findMany({
    where: {
      parishId,
      weekId
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true
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
}) {
  return prisma.event.create({
    data: {
      parishId: input.parishId,
      weekId: input.weekId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location
    },
    select: {
      id: true
    }
  });
}
