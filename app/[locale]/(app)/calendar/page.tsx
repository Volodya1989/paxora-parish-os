import { getServerSession } from "next-auth";
import CalendarView from "@/components/calendar/CalendarView";
import { getMonthRange, getWeekRange } from "@/lib/date/calendar";
import { listEventsByRange } from "@/lib/queries/events";
import { listPendingEventRequests } from "@/lib/queries/eventRequests";
import { getNow } from "@/lib/time/getNow";
import { isParishLeader } from "@/lib/permissions";
import { authOptions } from "@/server/auth/options";
import { ensureParishBootstrap } from "@/server/auth/bootstrap";
import { listGroupsByParish, getParishMembership } from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { CalendarIcon } from "@/components/icons/ParishIcons";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";

export default async function CalendarPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);
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

  const [
    membership,
    parish,
    groupMemberships,
    allGroupOptions,
    weekEvents,
    monthEvents,
    nextWeekEvents,
    pendingEventRequests
  ] = await Promise.all([
    getParishMembership(parishId, userId),
    prisma.parish.findUnique({
      where: { id: parishId },
      select: { name: true, logoUrl: true }
    }),
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
    listEventsByRange({ parishId, start: nextWeekRange.start, end: nextWeekRange.end, userId }),
    listPendingEventRequests({ parishId, actorUserId: userId })
  ]);

  const isLeader = membership ? isParishLeader(membership.role) : false;
  const groupIds = groupMemberships.map((membershipRecord) => membershipRecord.groupId);
  const canCreateGroupEvents = isLeader || groupIds.length > 0;
  const canCreateEvents = isLeader;
  const groupOptions = isLeader
    ? allGroupOptions
    : groupMemberships
        .map((membershipRecord) => membershipRecord.group)
        .filter((group): group is { id: string; name: string } => Boolean(group));

  return (
    <ParishionerPageLayout
      pageTitle={t("calendar.title")}
      parishName={parish?.name ?? t("serve.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      isLeader={isLeader}
      subtitle={t("calendar.subtitle")}
      gradientClass="from-teal-600 via-teal-500 to-emerald-500"
      icon={<CalendarIcon className="h-6 w-6 text-white" />}
    >
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
        canManageEventRequests={isLeader}
        groupOptions={groupOptions}
        viewerGroupIds={groupIds}
        pendingEventRequests={pendingEventRequests}
        canRequestContentCreate={membership?.role === "MEMBER"}
      />
    </ParishionerPageLayout>
  );
}
