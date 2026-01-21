import React from "react";
import ThisWeekAdminView from "@/components/this-week/ThisWeekAdminView";
import ThisWeekParishionerView from "@/components/this-week/ThisWeekParishionerView";
import ThisWeekViewToggle from "@/components/this-week/ThisWeekViewToggle";
import { getThisWeekData } from "@/lib/queries/this-week";
import { getWeekLabel, parseWeekSelection } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { formatDateRange } from "@/lib/this-week/formatters";
import { getThisWeekViewMode } from "@/lib/this-week/viewMode";
import { isAdminClergy } from "@/lib/authz/membership";

export const dynamic = "force-dynamic";

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
    searchParams: resolvedSearchParams
  });
  const viewToggle = isAdminClergy(data.parishRole) ? (
    <ThisWeekViewToggle value={viewMode} />
  ) : null;

  return viewMode === "admin" ? (
    <ThisWeekAdminView
      data={data}
      weekSelection={weekSelection}
      weekOptions={weekOptions}
      dateRange={dateRange}
      now={now}
      viewToggle={viewToggle}
    />
  ) : (
    <ThisWeekParishionerView
      data={data}
      weekSelection={weekSelection}
      weekOptions={weekOptions}
      now={now}
      viewToggle={viewToggle}
    />
  );
}
