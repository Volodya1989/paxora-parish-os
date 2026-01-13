import { prisma } from "@/server/db/prisma";
import { getMonthRange, getWeekRange } from "@/lib/date/calendar";
import { getNow as defaultGetNow } from "@/lib/time/getNow";

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  summary: string | null;
  parishId: string;
};

type ListEventsByRangeInput = {
  parishId: string;
  start: Date;
  end: Date;
};

type ListEventsForWeekInput = {
  parishId: string;
  getNow?: () => Date;
};

type ListEventsForMonthInput = {
  parishId: string;
  getNow?: () => Date;
};

export async function listEventsByRange({
  parishId,
  start,
  end
}: ListEventsByRangeInput): Promise<CalendarEvent[]> {
  const events = await prisma.event.findMany({
    where: {
      parishId,
      startsAt: {
        gte: start,
        lt: end
      }
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true,
      parishId: true
    }
  });

  return events.map((event) => ({
    ...event,
    summary: null
  }));
}

export async function listEventsForWeek({
  parishId,
  getNow
}: ListEventsForWeekInput): Promise<CalendarEvent[]> {
  const resolveNow = getNow ?? defaultGetNow;
  const { start, end } = getWeekRange({ getNow: resolveNow });
  return listEventsByRange({ parishId, start, end });
}

export async function listEventsForMonth({
  parishId,
  getNow
}: ListEventsForMonthInput): Promise<CalendarEvent[]> {
  const resolveNow = getNow ?? defaultGetNow;
  const { start, end } = getMonthRange({ getNow: resolveNow });
  return listEventsByRange({ parishId, start, end });
}
