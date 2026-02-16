"use server";

import type { EventRecurrenceFrequency, EventVisibility } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getNow } from "@/lib/time/getNow";
import { notifyEventReminder } from "@/lib/push/notify";
import { notifyEventReminderInApp } from "@/lib/notifications/notify";
import { PARISH_TIMEZONE } from "@/lib/time/parish";

const REMINDER_LEAD_MS = 60 * 60 * 1000;
const REMINDER_WINDOW_MS = 5 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const RSVP_ATTENDING_RESPONSES = ["YES", "MAYBE"] as const;

type EventRecord = {
  id: string;
  parishId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  visibility: EventVisibility;
  recurrenceFreq: EventRecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceByWeekday: number[];
  recurrenceUntil: Date | null;
};

type EventOccurrence = {
  eventId: string;
  parishId: string;
  title: string;
  startsAt: Date;
  visibility: EventVisibility;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

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

  const baseDay = startOfDay(event.startsAt);
  const rangeCursorStart = startOfDay(rangeStart);
  const rangeCursorEnd = startOfDay(rangeEnd);
  const durationMs = event.endsAt.getTime() - event.startsAt.getTime();
  const allowedDays =
    event.recurrenceFreq === "WEEKLY" && event.recurrenceByWeekday.length > 0
      ? event.recurrenceByWeekday
      : [event.startsAt.getDay()];
  const interval = Math.max(event.recurrenceInterval || 1, 1);

  const instances: Array<{ startsAt: Date; endsAt: Date }> = [];

  for (let cursor = rangeCursorStart; cursor < rangeCursorEnd; cursor = addDays(cursor, 1)) {
    const diffDays = Math.floor((cursor.getTime() - baseDay.getTime()) / MS_PER_DAY);
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
      if (!allowedDays.includes(cursor.getDay())) {
        continue;
      }
    }

    const occurrenceStart = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
      event.startsAt.getHours(),
      event.startsAt.getMinutes(),
      event.startsAt.getSeconds(),
      event.startsAt.getMilliseconds()
    );

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

function buildMembershipKey(parishId: string, userId: string) {
  return `${parishId}:${userId}`;
}

function formatReminderTime(startsAt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: PARISH_TIMEZONE
  }).format(startsAt);
}

export async function sendEventReminders() {
  const now = getNow();
  const windowStart = new Date(now.getTime() + REMINDER_LEAD_MS - REMINDER_WINDOW_MS);
  const windowEnd = new Date(now.getTime() + REMINDER_LEAD_MS + REMINDER_WINDOW_MS);

  const events = (await prisma.event.findMany({
    where: {
      deletedAt: null,
      OR: [
        {
          recurrenceFreq: "NONE",
          startsAt: {
            gte: windowStart,
            lt: windowEnd
          }
        },
        {
          recurrenceFreq: { in: ["DAILY", "WEEKLY"] },
          startsAt: { lt: windowEnd },
          AND: [{ OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: windowStart } }] }]
        }
      ]
    },
    select: {
      id: true,
      parishId: true,
      title: true,
      startsAt: true,
      endsAt: true,
      visibility: true,
      recurrenceFreq: true,
      recurrenceInterval: true,
      recurrenceByWeekday: true,
      recurrenceUntil: true
    }
  })) as EventRecord[];

  const occurrences: EventOccurrence[] = events.flatMap((event) => {
    const instances = expandRecurringEvent(event, windowStart, windowEnd);
    return instances.map((instance) => ({
      eventId: event.id,
      parishId: event.parishId,
      title: event.title,
      startsAt: instance.startsAt,
      visibility: event.visibility
    }));
  });

  if (occurrences.length === 0) {
    return { sent: 0, skipped: 0, total: 0 };
  }

  const eventIds = [...new Set(occurrences.map((occurrence) => occurrence.eventId))];
  const parishIds = [...new Set(occurrences.map((occurrence) => occurrence.parishId))];

  const rsvps = await prisma.eventRsvp.findMany({
    where: {
      eventId: { in: eventIds },
      response: { in: [...RSVP_ATTENDING_RESPONSES] }
    },
    select: {
      eventId: true,
      userId: true
    }
  });

  const rsvpUserIds = [...new Set(rsvps.map((rsvp) => rsvp.userId))];
  const rsvpMemberships = rsvpUserIds.length
    ? await prisma.membership.findMany({
        where: {
          parishId: { in: parishIds },
          userId: { in: rsvpUserIds },
          notifyEmailEnabled: true
        },
        select: {
          parishId: true,
          userId: true
        }
      })
    : [];
  const rsvpMembershipKeys = new Set(
    rsvpMemberships.map((membership) => buildMembershipKey(membership.parishId, membership.userId))
  );

  const rsvpByEvent = new Map<string, string[]>();
  for (const rsvp of rsvps) {
    const list = rsvpByEvent.get(rsvp.eventId) ?? [];
    list.push(rsvp.userId);
    rsvpByEvent.set(rsvp.eventId, list);
  }

  const privateLeaders = await prisma.membership.findMany({
    where: {
      parishId: { in: parishIds },
      role: { in: ["ADMIN", "SHEPHERD"] },
      notifyEmailEnabled: true
    },
    select: {
      parishId: true,
      userId: true
    }
  });
  const leaderByParish = new Map<string, string[]>();
  for (const leader of privateLeaders) {
    const list = leaderByParish.get(leader.parishId) ?? [];
    list.push(leader.userId);
    leaderByParish.set(leader.parishId, list);
  }

  const existingReminders = await prisma.eventReminder.findMany({
    where: {
      eventId: { in: eventIds },
      startsAt: { in: occurrences.map((occurrence) => occurrence.startsAt) }
    },
    select: {
      eventId: true,
      userId: true,
      startsAt: true
    }
  });

  const existingKeys = new Set(
    existingReminders.map(
      (reminder) => `${reminder.eventId}:${reminder.userId}:${reminder.startsAt.toISOString()}`
    )
  );

  let sent = 0;
  let skipped = 0;

  for (const occurrence of occurrences) {
    const recipients = new Set<string>();
    const rsvpRecipients = rsvpByEvent.get(occurrence.eventId) ?? [];
    for (const userId of rsvpRecipients) {
      if (rsvpMembershipKeys.has(buildMembershipKey(occurrence.parishId, userId))) {
        recipients.add(userId);
      }
    }

    if (occurrence.visibility === "PRIVATE") {
      const leaders = leaderByParish.get(occurrence.parishId) ?? [];
      leaders.forEach((userId) => recipients.add(userId));
    }

    const filteredRecipients = [...recipients].filter(
      (userId) =>
        !existingKeys.has(`${occurrence.eventId}:${userId}:${occurrence.startsAt.toISOString()}`)
    );

    if (filteredRecipients.length === 0) {
      skipped += 1;
      continue;
    }

    const reminderTime = formatReminderTime(occurrence.startsAt);

    await notifyEventReminder({
      eventId: occurrence.eventId,
      eventTitle: occurrence.title,
      parishId: occurrence.parishId,
      recipientIds: filteredRecipients,
      startsAtLabel: reminderTime
    });
    await notifyEventReminderInApp({
      eventId: occurrence.eventId,
      eventTitle: occurrence.title,
      parishId: occurrence.parishId,
      recipientIds: filteredRecipients,
      startsAtLabel: reminderTime
    });

    await prisma.eventReminder.createMany({
      data: filteredRecipients.map((userId) => ({
        eventId: occurrence.eventId,
        userId,
        startsAt: occurrence.startsAt
      })),
      skipDuplicates: true
    });

    sent += filteredRecipients.length;
  }

  return { sent, skipped, total: occurrences.length };
}
