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
import { listParishHubItemsForMember, ensureParishHubDefaults } from "@/server/actions/parish-hub";

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

  // Fetch Parish Hub items for parishioner view
  let hubItems: Array<{
    id: string;
    label: string;
    icon: "BULLETIN" | "MASS_TIMES" | "CONFESSION" | "WEBSITE" | "CALENDAR" | "READINGS" | "GIVING" | "CONTACT" | "FACEBOOK" | "YOUTUBE" | "PRAYER" | "NEWS";
    targetType: "EXTERNAL" | "INTERNAL";
    targetUrl: string | null;
    internalRoute: string | null;
  }> = [];

  if (viewMode === "parishioner") {
    try {
      await ensureParishHubDefaults();
      const items = await listParishHubItemsForMember();
      hubItems = items.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon as typeof hubItems[number]["icon"],
        targetType: item.targetType,
        targetUrl: item.targetUrl,
        internalRoute: item.internalRoute
      }));
    } catch {
      // Parish Hub not enabled or error - show nothing
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
      weekOptions={weekOptions}
      now={now}
      viewToggle={viewToggle}
      hubItems={hubItems}
    />
  );
}
