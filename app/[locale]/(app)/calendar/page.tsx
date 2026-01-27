import { getServerSession } from "next-auth";
import CalendarView from "@/components/calendar/CalendarView";
import { getMonthRange, getWeekRange } from "@/lib/date/calendar";
import { listEventsByRange } from "@/lib/queries/events";
import { getNow } from "@/lib/time/getNow";
import { isParishLeader } from "@/lib/permissions";
import { authOptions } from "@/server/auth/options";
import { ensureParishBootstrap } from "@/server/auth/bootstrap";
import { listGroupsByParish, getParishMembership } from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const activeParishId = session.user.activeParishId;
  const parishId = activeParishId
    ? await prisma.parish
        .findUnique({
          where: { id: activeParishId },
          select: { id: true }
        })
        .then((parish) => parish?.id ?? ensureParishBootstrap(userId))
    : await ensureParishBootstrap(userId);

  const now = getNow();
  const weekRange = getWeekRange({ now });
  const monthRange = getMonthRange({ now });
  const nextWeekNow = new Date(now);
  nextWeekNow.setDate(nextWeekNow.getDate() + 7);
  const nextWeekRange = getWeekRange({ now: nextWeekNow });

  const [membership, groupMemberships, allGroupOptions, weekEvents, monthEvents, nextWeekEvents] =
    await Promise.all([
      getParishMembership(parishId, userId),
      prisma.groupMembership.findMany({
        where: {
          userId,
          status: "ACTIVE",
          group: { parishId }
        },
        select: {
          groupId: true,
          group: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      listGroupsByParish(parishId),
      listEventsByRange({ parishId, start: weekRange.start, end: weekRange.end, userId }),
      listEventsByRange({ parishId, start: monthRange.start, end: monthRange.end, userId }),
      listEventsByRange({ parishId, start: nextWeekRange.start, end: nextWeekRange.end, userId })
    ]);

  const isLeader = membership ? isParishLeader(membership.role) : false;
  const groupIds = groupMemberships.map((membershipRecord) => membershipRecord.groupId);
  const canCreateGroupEvents = isLeader || groupIds.length > 0;
  const canCreateEvents = isLeader || canCreateGroupEvents;
  const groupOptions = isLeader
    ? allGroupOptions
    : groupMemberships
        .map((membershipRecord) => membershipRecord.group)
        .filter((group): group is { id: string; name: string } => Boolean(group));

  return (
    <CalendarView
      weekRange={weekRange}
      monthRange={monthRange}
      nextWeekRange={nextWeekRange}
      weekEvents={weekEvents}
      monthEvents={monthEvents}
      nextWeekEvents={nextWeekEvents}
      now={now}
      canCreateEvents={canCreateEvents}
      canCreatePublicEvents={isLeader}
      canCreatePrivateEvents={isLeader}
      canCreateGroupEvents={canCreateGroupEvents}
      isEditor={isLeader || canCreateGroupEvents}
      groupOptions={groupOptions}
      viewerGroupIds={groupIds}
    />
  );
}
