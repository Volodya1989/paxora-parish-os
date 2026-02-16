import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { prisma } from "@/server/db/prisma";
import { getMonthRange, getWeekRange } from "@/lib/date/calendar";
import { getNow as defaultGetNow } from "@/lib/time/getNow";
import { PARISH_TIMEZONE } from "@/lib/time/parish";
import { isParishLeader } from "@/lib/permissions";
import { getParishMembership } from "@/server/db/groups";
import type {
  EventRecurrenceFrequency,
  EventRsvpResponse,
  EventType,
  EventVisibility,
  Prisma
} from "@prisma/client";

type EventGroup = {
  id: string;
  name: string;
};

export type CalendarEvent = {
  id: string;
  instanceId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  summary: string;
  parishId: string;
  visibility: EventVisibility;
  group: EventGroup | null;
  type: EventType;
  recurrenceFreq: EventRecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceByWeekday: number[];
  recurrenceUntil: Date | null;
  rsvpResponse: EventRsvpResponse | null;
  rsvpTotalCount: number;
  canManage: boolean;
};

export type EventDetail = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  summary: string;
  parishId: string;
  visibility: EventVisibility;
  group: EventGroup | null;
  type: EventType;
  recurrenceFreq: EventRecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceByWeekday: number[];
  recurrenceUntil: Date | null;
  rsvpResponse: EventRsvpResponse | null;
  rsvpTotalCount: number;
  canManage: boolean;
};

type ListEventsByRangeInput = {
  parishId: string;
  start: Date;
  end: Date;
  userId?: string;
};

type ListEventsForWeekInput = {
  parishId: string;
  getNow?: () => Date;
  userId?: string;
};

type ListEventsForMonthInput = {
  parishId: string;
  getNow?: () => Date;
  userId?: string;
};

type GetEventByIdInput = {
  id: string;
  userId?: string;
};

type EventViewerContext = {
  isLeader: boolean;
  groupIds: string[];
  userId?: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getParishDayStamp(date: Date) {
  const parishDate = toZonedTime(date, PARISH_TIMEZONE);
  return Date.UTC(parishDate.getFullYear(), parishDate.getMonth(), parishDate.getDate());
}

function buildInstanceId(eventId: string, startsAt: Date) {
  return `${eventId}-${startsAt.getTime()}`;
}

function resolveSummary(event: { summary: string | null; location: string | null; type: EventType }) {
  if (event.summary && event.summary.trim().length > 0) {
    return event.summary;
  }

  if (event.location) {
    return `Location: ${event.location}`;
  }

  return event.type === "SERVICE"
    ? "Service details will be shared closer to the date."
    : "Event details will be shared closer to the date.";
}

async function getViewerContext(
  parishId: string,
  userId?: string
): Promise<EventViewerContext> {
  if (!userId) {
    return { isLeader: false, groupIds: [] };
  }

  const [membership, groupMemberships] = await Promise.all([
    getParishMembership(parishId, userId),
    prisma.groupMembership.findMany({
      where: {
        userId,
        status: "ACTIVE",
        group: { parishId }
      },
      select: { groupId: true }
    })
  ]);

  return {
    isLeader: membership ? isParishLeader(membership.role) : false,
    groupIds: groupMemberships.map((membership) => membership.groupId),
    userId
  };
}

function buildVisibilityFilter(context: EventViewerContext) {
  if (context.isLeader) {
    return undefined;
  }

  const filters: Prisma.EventWhereInput[] = [{ visibility: "PUBLIC" }];

  if (context.groupIds.length > 0) {
    filters.push({ visibility: "GROUP", groupId: { in: context.groupIds } });
  }

  if (context.userId) {
    filters.push({ visibility: "PRIVATE", rsvps: { some: { userId: context.userId } } });
  }

  return { OR: filters };
}

type EventRecord = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  summary: string | null;
  parishId: string;
  visibility: EventVisibility;
  type: EventType;
  group: EventGroup | null;
  recurrenceFreq: EventRecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceByWeekday: number[];
  recurrenceUntil: Date | null;
  rsvps?: Array<{ response: EventRsvpResponse }>;
};

const RSVP_ATTENDING_RESPONSES: EventRsvpResponse[] = ["YES", "MAYBE"];

function expandRecurringEvent(
  event: EventRecord,
  rangeStart: Date,
  rangeEnd: Date
): Array<{ startsAt: Date; endsAt: Date }> {
  if (event.recurrenceFreq === "NONE") {
    if (event.startsAt >= rangeStart && event.startsAt < rangeEnd) {
      return [{ startsAt: event.startsAt, endsAt: event.endsAt }];
    }
    return [];
  }

  const eventLocal = toZonedTime(event.startsAt, PARISH_TIMEZONE);
  const baseDay = getParishDayStamp(event.startsAt);
  const rangeCursorStart = getParishDayStamp(rangeStart);
  const rangeCursorEnd = getParishDayStamp(rangeEnd);
  const durationMs = event.endsAt.getTime() - event.startsAt.getTime();
  const allowedDays =
    event.recurrenceFreq === "WEEKLY" && event.recurrenceByWeekday.length > 0
      ? event.recurrenceByWeekday
      : [eventLocal.getDay()];
  const interval = Math.max(event.recurrenceInterval || 1, 1);

  const instances: Array<{ startsAt: Date; endsAt: Date }> = [];

  for (let cursor = rangeCursorStart; cursor < rangeCursorEnd; cursor += MS_PER_DAY) {
    const diffDays = Math.floor((cursor - baseDay) / MS_PER_DAY);
    if (diffDays < 0) {
      continue;
    }

    if (event.recurrenceFreq === "DAILY") {
      if (diffDays % interval !== 0) {
        continue;
      }
    } else if (event.recurrenceFreq === "WEEKLY") {
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks % interval !== 0) {
        continue;
      }
      const cursorDay = new Date(cursor).getUTCDay();
      if (!allowedDays.includes(cursorDay)) {
        continue;
      }
    }

    const cursorDate = new Date(cursor);
    const occurrenceLocal = new Date(
      cursorDate.getUTCFullYear(),
      cursorDate.getUTCMonth(),
      cursorDate.getUTCDate(),
      eventLocal.getHours(),
      eventLocal.getMinutes(),
      eventLocal.getSeconds(),
      eventLocal.getMilliseconds()
    );
    const occurrenceStart = fromZonedTime(occurrenceLocal, PARISH_TIMEZONE);

    if (occurrenceStart < rangeStart || occurrenceStart >= rangeEnd) {
      continue;
    }

    if (event.recurrenceUntil && occurrenceStart > event.recurrenceUntil) {
      continue;
    }

    const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);

    instances.push({ startsAt: occurrenceStart, endsAt: occurrenceEnd });
  }

  return instances;
}

export async function listEventsByRange({
  parishId,
  start,
  end,
  userId
}: ListEventsByRangeInput): Promise<CalendarEvent[]> {
  const context = await getViewerContext(parishId, userId);
  const visibilityFilter = buildVisibilityFilter(context);
  const events = (await prisma.event.findMany({
    where: {
      parishId,
      deletedAt: null,
      OR: [
        {
          recurrenceFreq: "NONE",
          startsAt: {
            gte: start,
            lt: end
          }
        },
        {
          recurrenceFreq: { in: ["DAILY", "WEEKLY"] },
          startsAt: {
            lt: end
          },
          ...(start
            ? {
                AND: [
                  {
                    OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: start } }]
                  }
                ]
              }
            : {})
        }
      ],
      ...(visibilityFilter ? { AND: [visibilityFilter] } : {})
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true,
      summary: true,
      parishId: true,
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
      },
      ...(userId
        ? {
            rsvps: {
              where: { userId },
              select: { response: true }
            }
          }
        : {})
    }
  })) as EventRecord[];

  const eventIds = events.map((event) => event.id);
  const rsvpCounts =
    eventIds.length > 0
      ? await prisma.eventRsvp.groupBy({
          by: ["eventId"],
          where: {
            eventId: { in: eventIds },
            response: { in: RSVP_ATTENDING_RESPONSES }
          },
          _count: {
            _all: true
          }
        })
      : [];
  const rsvpCountByEventId = new Map(
    rsvpCounts.map((item) => [item.eventId, item._count._all])
  );

  const expanded = events.flatMap((event) => {
    const rsvpResponse = "rsvps" in event ? event.rsvps?.[0]?.response ?? null : null;
    const rsvpTotalCount = rsvpCountByEventId.get(event.id) ?? 0;
    const instances = expandRecurringEvent(event, start, end);
    return instances.map((instance) => ({
      id: event.id,
      instanceId: buildInstanceId(event.id, instance.startsAt),
      title: event.title,
      startsAt: instance.startsAt,
      endsAt: instance.endsAt,
      location: event.location,
      summary: resolveSummary(event),
      parishId: event.parishId,
      visibility: event.visibility,
      group: event.group ? { id: event.group.id, name: event.group.name } : null,
      type: event.type,
      recurrenceFreq: event.recurrenceFreq,
      recurrenceInterval: event.recurrenceInterval,
      recurrenceByWeekday: event.recurrenceByWeekday,
      recurrenceUntil: event.recurrenceUntil,
      rsvpResponse,
      rsvpTotalCount,
      canManage:
        context.isLeader ||
        (event.group?.id ? context.groupIds.includes(event.group.id) : false)
    }));
  });

  return expanded.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export async function listEventsForWeek({
  parishId,
  getNow,
  userId
}: ListEventsForWeekInput): Promise<CalendarEvent[]> {
  const resolveNow = getNow ?? defaultGetNow;
  const { start, end } = getWeekRange({ getNow: resolveNow });
  return listEventsByRange({ parishId, start, end, userId });
}

export async function listEventsForMonth({
  parishId,
  getNow,
  userId
}: ListEventsForMonthInput): Promise<CalendarEvent[]> {
  const resolveNow = getNow ?? defaultGetNow;
  const { start, end } = getMonthRange({ getNow: resolveNow });
  return listEventsByRange({ parishId, start, end, userId });
}

export async function getEventById({
  id,
  userId
}: GetEventByIdInput): Promise<EventDetail | null> {
  const event = await prisma.event.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true,
      summary: true,
      parishId: true,
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
      },
      ...(userId
        ? {
            rsvps: {
              where: { userId },
              select: { response: true }
            }
          }
        : {})
    }
  });

  if (!event) {
    return null;
  }

  const context = await getViewerContext(event.parishId, userId);
  const visibilityFilter = buildVisibilityFilter(context);

  if (visibilityFilter && !context.isLeader) {
    const allowed =
      event.visibility === "PUBLIC" ||
      (event.visibility === "GROUP" &&
        event.group?.id &&
        context.groupIds.includes(event.group.id)) ||
      (event.visibility === "PRIVATE" && (event.rsvps?.length ?? 0) > 0);

    if (!allowed) {
      return null;
    }
  }

  const rsvpResponse = "rsvps" in event ? event.rsvps?.[0]?.response ?? null : null;
  const rsvpTotalCount = await prisma.eventRsvp.count({
    where: {
      eventId: event.id,
      response: { in: RSVP_ATTENDING_RESPONSES }
    }
  });

  return {
    id: event.id,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.location,
    summary: event.summary ?? "",
    parishId: event.parishId,
    visibility: event.visibility,
    group: event.group ? { id: event.group.id, name: event.group.name } : null,
    type: event.type,
    recurrenceFreq: event.recurrenceFreq,
    recurrenceInterval: event.recurrenceInterval,
    recurrenceByWeekday: event.recurrenceByWeekday,
    recurrenceUntil: event.recurrenceUntil,
    rsvpResponse,
    rsvpTotalCount,
    canManage:
      context.isLeader || (event.group?.id ? context.groupIds.includes(event.group.id) : false)
  };
}
