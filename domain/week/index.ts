import { prisma } from "@/server/db/prisma";

export function getWeekStartMonday(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getWeekEnd(start: Date): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

export function getWeekLabel(date: Date): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNumber =
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
  const year = target.getUTCFullYear();
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
}

export async function getOrCreateCurrentWeek(parishId: string) {
  const now = new Date();
  const startsOn = getWeekStartMonday(now);
  const endsOn = getWeekEnd(startsOn);
  const label = getWeekLabel(startsOn);

  const currentWeek = await prisma.week.upsert({
    where: {
      parishId_startsOn: {
        parishId,
        startsOn
      }
    },
    update: {},
    create: {
      parishId,
      startsOn,
      endsOn,
      label
    }
  });

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
