import { prisma } from "@/server/db/prisma";
import { getMonthRange } from "@/lib/date/calendar";
import { getNow as defaultGetNow } from "@/lib/time/getNow";
import { getOrCreateCurrentWeek } from "@/domain/week";

type RangeInput = {
  parishId: string;
  getNow?: () => Date;
};

export async function getHoursSummary({ parishId, getNow }: RangeInput) {
  const now = (getNow ?? defaultGetNow)();
  const week = await getOrCreateCurrentWeek(parishId, now);
  const { start: monthStart, end: monthEnd } = getMonthRange({ now });

  const [weekTotal, monthTotal, groupTotals] = await Promise.all([
    prisma.hoursEntry.aggregate({
      where: { parishId, weekId: week.id },
      _sum: { hours: true }
    }),
    prisma.hoursEntry.aggregate({
      where: {
        parishId,
        createdAt: {
          gte: monthStart,
          lt: monthEnd
        }
      },
      _sum: { hours: true }
    }),
    prisma.hoursEntry.groupBy({
      by: ["groupId"],
      where: {
        parishId,
        weekId: week.id,
        groupId: { not: null }
      },
      _sum: { hours: true }
    })
  ]);

  const groupIds = groupTotals
    .map((group) => group.groupId)
    .filter((groupId): groupId is string => Boolean(groupId));
  const groups = groupIds.length
    ? await prisma.group.findMany({
        where: { id: { in: groupIds } },
        select: { id: true, name: true }
      })
    : [];
  const groupMap = new Map(groups.map((group) => [group.id, group.name]));

  return {
    week,
    weekTotal: weekTotal._sum.hours ?? 0,
    monthTotal: monthTotal._sum.hours ?? 0,
    groupBreakdown: groupTotals
      .map((group) => ({
        groupId: group.groupId ?? "",
        groupName: group.groupId ? groupMap.get(group.groupId) ?? "Group" : "Ungrouped",
        hours: group._sum.hours ?? 0
      }))
      .filter((group) => group.groupId)
      .sort((a, b) => b.hours - a.hours)
  };
}

export async function getHoursLeaderboards({ parishId, getNow }: RangeInput) {
  const now = (getNow ?? defaultGetNow)();
  const week = await getOrCreateCurrentWeek(parishId, now);
  const { start: monthStart, end: monthEnd } = getMonthRange({ now });

  const [weekLeaders, monthLeaders] = await Promise.all([
    prisma.hoursEntry.groupBy({
      by: ["userId"],
      where: {
        parishId,
        weekId: week.id,
        user: { volunteerHoursOptIn: true }
      },
      _sum: { hours: true },
      orderBy: { _sum: { hours: "desc" } },
      take: 5
    }),
    prisma.hoursEntry.groupBy({
      by: ["userId"],
      where: {
        parishId,
        createdAt: {
          gte: monthStart,
          lt: monthEnd
        },
        user: { volunteerHoursOptIn: true }
      },
      _sum: { hours: true },
      orderBy: { _sum: { hours: "desc" } },
      take: 5
    })
  ]);

  const userIds = [...weekLeaders, ...monthLeaders].map((entry) => entry.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
      })
    : [];
  const userMap = new Map(users.map((user) => [user.id, user.name ?? user.email ?? "Member"]));

  const mapLeaders = (leaders: Array<{ userId: string; _sum: { hours: number | null } }>) =>
    leaders.map((entry) => ({
      userId: entry.userId,
      name: userMap.get(entry.userId) ?? "Member",
      hours: entry._sum.hours ?? 0
    }));

  return {
    week: mapLeaders(weekLeaders),
    month: mapLeaders(monthLeaders)
  };
}

export async function getUserYtdHours({
  parishId,
  userId,
  getNow
}: {
  parishId: string;
  userId: string;
  getNow?: () => Date;
}) {
  const now = (getNow ?? defaultGetNow)();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  const total = await prisma.hoursEntry.aggregate({
    where: {
      parishId,
      userId,
      createdAt: {
        gte: startOfYear,
        lte: now
      }
    },
    _sum: { hours: true }
  });

  return total._sum.hours ?? 0;
}
