import { getWeekEnd, getWeekLabel, getWeekStartMonday } from "@/lib/date/week";
import { rolloverOpenTasks } from "@/domain/tasks";
import { prisma } from "@/server/db/prisma";

export type WeekSelection = "previous" | "current" | "next";

export function parseWeekSelection(value?: string | string[] | null): WeekSelection {
  if (value === "previous") {
    return "previous";
  }
  return value === "next" ? "next" : "current";
}

export { getWeekEnd, getWeekLabel, getWeekStartMonday };

export async function getWeekForSelection(
  parishId: string,
  selection: WeekSelection,
  now: Date = new Date()
) {
  const currentWeek = await getOrCreateCurrentWeek(parishId, now);

  if (selection === "current") {
    return currentWeek;
  }

  if (selection === "previous") {
    const previousStart = new Date(currentWeek.startsOn);
    previousStart.setDate(previousStart.getDate() - 7);
    const previousWeek =
      (await prisma.week.findUnique({
        where: {
          parishId_startsOn: {
            parishId,
            startsOn: previousStart
          }
        }
      })) ??
      (await prisma.week.create({
        data: {
          parishId,
          startsOn: previousStart,
          endsOn: getWeekEnd(previousStart),
          label: getWeekLabel(previousStart)
        }
      }));

    return previousWeek;
  }

  const nextStart = getWeekEnd(currentWeek.startsOn);
  const nextWeek =
    (await prisma.week.findUnique({
      where: {
        parishId_startsOn: {
          parishId,
          startsOn: nextStart
        }
      }
    })) ??
    (await prisma.week.create({
      data: {
        parishId,
        startsOn: nextStart,
        endsOn: getWeekEnd(nextStart),
        label: getWeekLabel(nextStart)
      }
    }));

  return nextWeek;
}

export async function getOrCreateCurrentWeek(parishId: string, now: Date = new Date()) {
  const startsOn = getWeekStartMonday(now);
  const endsOn = getWeekEnd(startsOn);
  const label = getWeekLabel(startsOn);

  const existingWeek = await prisma.week.findUnique({
    where: {
      parishId_startsOn: {
        parishId,
        startsOn
      }
    }
  });

  const currentWeek =
    existingWeek ??
    (await prisma.week.create({
      data: {
        parishId,
        startsOn,
        endsOn,
        label
      }
    }));

  if (!existingWeek) {
    const previousStart = new Date(startsOn);
    previousStart.setDate(previousStart.getDate() - 7);
    const previousWeek = await prisma.week.findUnique({
      where: {
        parishId_startsOn: {
          parishId,
          startsOn: previousStart
        }
      }
    });

    if (previousWeek) {
      await rolloverOpenTasks({
        parishId,
        fromWeekId: previousWeek.id,
        toWeekId: currentWeek.id
      });
    }
  }

  const nextStart = getWeekEnd(startsOn);
  const nextEnd = getWeekEnd(nextStart);
  const nextLabel = getWeekLabel(nextStart);

  await prisma.week.upsert({
    where: {
      parishId_startsOn: {
        parishId,
        startsOn: nextStart
      }
    },
    update: {},
    create: {
      parishId,
      startsOn: nextStart,
      endsOn: nextEnd,
      label: nextLabel
    }
  });

  return currentWeek;
}
