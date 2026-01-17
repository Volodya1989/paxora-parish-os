import { prisma } from "@/server/db/prisma";
import { getMonthRange, getWeekRange } from "@/lib/date/calendar";
import { getNow as defaultGetNow } from "@/lib/time/getNow";
import { isParishLeader } from "@/lib/permissions";
import { getParishMembership } from "@/server/db/groups";
import type { EventRsvpResponse, EventType, EventVisibility } from "@prisma/client";

type EventGroup = {
  id: string;
  name: string;
};

export type CalendarEvent = {
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
  rsvpResponse: EventRsvpResponse | null;
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
  rsvpResponse: EventRsvpResponse | null;
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
};

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
        group: { parishId }
      },
      select: { groupId: true }
    })
  ]);

  return {
    isLeader: membership ? isParishLeader(membership.role) : false,
    groupIds: groupMemberships.map((membership) => membership.groupId)
  };
}

function buildVisibilityFilter(context: EventViewerContext) {
  if (context.isLeader) {
    return undefined;
  }

  const filters: Array<{ visibility: EventVisibility; groupId?: { in: string[] } }> = [
    { visibility: "PUBLIC" }
  ];

  if (context.groupIds.length > 0) {
    filters.push({ visibility: "GROUP", groupId: { in: context.groupIds } });
  }

  return { OR: filters };
}

export async function listEventsByRange({
  parishId,
  start,
  end,
  userId
}: ListEventsByRangeInput): Promise<CalendarEvent[]> {
  const context = await getViewerContext(parishId, userId);
  const visibilityFilter = buildVisibilityFilter(context);
  const events = await prisma.event.findMany({
    where: {
      parishId,
      startsAt: {
        gte: start,
        lt: end
      },
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

  return events.map((event) => {
    const rsvpResponse = "rsvps" in event ? event.rsvps?.[0]?.response ?? null : null;

    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location,
      summary: resolveSummary(event),
      parishId: event.parishId,
      visibility: event.visibility,
      group: event.group ? { id: event.group.id, name: event.group.name } : null,
      type: event.type,
      rsvpResponse,
      canManage: context.isLeader || (event.group?.id ? context.groupIds.includes(event.group.id) : false)
    };
  });
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
    where: { id },
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
        context.groupIds.includes(event.group.id));

    if (!allowed) {
      return null;
    }
  }

  const rsvpResponse = "rsvps" in event ? event.rsvps?.[0]?.response ?? null : null;

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
    rsvpResponse,
    canManage:
      context.isLeader || (event.group?.id ? context.groupIds.includes(event.group.id) : false)
  };
}
