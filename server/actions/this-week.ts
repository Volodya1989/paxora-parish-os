import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";

export type ThisWeekSummary = {
  week: {
    id: string;
    label: string;
    startsOn: Date;
    endsOn: Date;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  }>;
  digestStatus: "none" | "draft" | "published";
};

export async function getThisWeekSummary(): Promise<ThisWeekSummary> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const week = await getOrCreateCurrentWeek(parishId);

  const [tasks, events, digest] = await Promise.all([
    prisma.task.findMany({
      where: { parishId, weekId: week.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, status: true }
    }),
    prisma.event.findMany({
      where: { parishId, weekId: week.id },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true, endsAt: true, location: true }
    }),
    prisma.digest.findUnique({
      where: { parishId_weekId: { parishId, weekId: week.id } },
      select: { status: true }
    })
  ]);

  const digestStatus = digest?.status === "PUBLISHED" ? "published" : digest ? "draft" : "none";

  return {
    week: {
      id: week.id,
      label: week.label,
      startsOn: week.startsOn,
      endsOn: week.endsOn
    },
    tasks,
    events,
    digestStatus
  };
}
