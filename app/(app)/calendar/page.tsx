import { getServerSession } from "next-auth";
import CalendarView from "@/components/calendar/CalendarView";
import { getMonthRange, getWeekRange } from "@/lib/date/calendar";
import { listEventsByRange } from "@/lib/queries/events";
import { getNow } from "@/lib/time/getNow";
import { authOptions } from "@/server/auth/options";
import { ensureParishBootstrap } from "@/server/auth/bootstrap";
import { prisma } from "@/server/db/prisma";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const activeParishId = session.user.activeParishId;
  const parishId = activeParishId
    ? await prisma.parish
        .findUnique({
          where: { id: activeParishId },
          select: { id: true }
        })
        .then((parish) => parish?.id ?? ensureParishBootstrap(session.user.id))
    : await ensureParishBootstrap(session.user.id);

  const now = getNow();
  const weekRange = getWeekRange({ now });
  const monthRange = getMonthRange({ now });

  const [weekEvents, monthEvents] = await Promise.all([
    listEventsByRange({ parishId, start: weekRange.start, end: weekRange.end }),
    listEventsByRange({ parishId, start: monthRange.start, end: monthRange.end })
  ]);

  return (
    <CalendarView
      weekRange={weekRange}
      monthRange={monthRange}
      weekEvents={weekEvents}
      monthEvents={monthEvents}
      now={now}
    />
  );
}
