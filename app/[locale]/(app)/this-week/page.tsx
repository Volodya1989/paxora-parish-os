import React from "react";
import ThisWeekAdminView from "@/components/this-week/ThisWeekAdminView";
import ThisWeekParishionerView from "@/components/this-week/ThisWeekParishionerView";
import ThisWeekViewToggle from "@/components/this-week/ThisWeekViewToggle";
import { getThisWeekData } from "@/lib/queries/this-week";
import { getWeekLabel, parseWeekSelection } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { formatDateRange } from "@/lib/this-week/formatters";
import { getThisWeekViewMode } from "@/lib/this-week/viewMode";
import { getGratitudeAdminData } from "@/lib/queries/gratitude";
import { prisma } from "@/server/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildWeekOptions(weekStart: Date) {
  const previousStart = new Date(weekStart);
  previousStart.setDate(previousStart.getDate() - 7);
  const nextStart = new Date(weekStart);
  nextStart.setDate(nextStart.getDate() + 7);

  return [
    {
      value: "previous" as const,
      label: getWeekLabel(previousStart),
      range: formatDateRange(previousStart, new Date(previousStart.getTime() + 7 * 24 * 60 * 60 * 1000))
    },
    {
      value: "current" as const,
      label: getWeekLabel(weekStart),
      range: formatDateRange(weekStart, new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))
    },
    {
      value: "next" as const,
      label: getWeekLabel(nextStart),
      range: formatDateRange(nextStart, new Date(nextStart.getTime() + 7 * 24 * 60 * 60 * 1000))
    }
  ];
}

export default async function ThisWeekPage({
  searchParams
}: {
  searchParams?: Promise<{ week?: string | string[]; view?: string | string[] } | undefined>;
}) {
  const resolvedSearchParams = await searchParams;
  const weekSelection = parseWeekSelection(resolvedSearchParams?.week);
  const now = getNow();
  const data = await getThisWeekData({ weekSelection, now });
  const weekOptions = buildWeekOptions(data.week.startsOn);
  const dateRange = formatDateRange(data.week.startsOn, data.week.endsOn);
  const viewMode = getThisWeekViewMode({
    sessionRole: data.parishRole,
    canManage: data.canManageSpotlight,
    searchParams: resolvedSearchParams
  });
  const viewToggle = data.canManageSpotlight ? (
    <ThisWeekViewToggle value={viewMode} />
  ) : null;
  const spotlightAdmin =
    viewMode === "admin" && data.canManageSpotlight
      ? await getGratitudeAdminData({ parishId: data.parishId, weekId: data.week.id })
      : null;

  // Fetch parish name for the header (parishioner view)
  let parishName = "Mother of God Ukrainian Catholic Church"; // MVP default
  if (viewMode === "parishioner") {
    const session = await getServerSession(authOptions);
    if (session?.user?.activeParishId) {
      const parish = await prisma.parish.findUnique({
        where: { id: session.user.activeParishId },
        select: { name: true }
      });
      if (parish?.name) {
        parishName = parish.name;
      }
    }
  }

  return viewMode === "admin" ? (
    <ThisWeekAdminView
      data={data}
      weekSelection={weekSelection}
      weekOptions={weekOptions}
      dateRange={dateRange}
      now={now}
      viewToggle={viewToggle}
      spotlightAdmin={spotlightAdmin}
    />
  ) : (
    <ThisWeekParishionerView
      data={data}
      weekSelection={weekSelection}
      now={now}
      viewToggle={viewToggle}
      parishName={parishName}
    />
  );
}
