import React from "react";
import ThisWeekAdminView from "@/components/this-week/ThisWeekAdminView";
import ThisWeekParishionerView from "@/components/this-week/ThisWeekParishionerView";
import ThisWeekViewToggle from "@/components/this-week/ThisWeekViewToggle";
import { getThisWeekData } from "@/lib/queries/this-week";
import { parseWeekSelection } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { getThisWeekViewMode } from "@/lib/this-week/viewMode";
import { getGratitudeAdminData } from "@/lib/queries/gratitude";
import { prisma } from "@/server/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";
import StartThisWeekCard from "@/components/this-week/StartThisWeekCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ThisWeekPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ week?: string | string[]; view?: string | string[] } | undefined>;
}) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);
  const resolvedSearchParams = await searchParams;
  const weekSelection = parseWeekSelection(resolvedSearchParams?.week);
  const now = getNow();
  const data = await getThisWeekData({ weekSelection, now });
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

  // Fetch parish name and user name for the header (both views use same header now)
  let parishName = t("serve.myParish");
  let parishLogoUrl: string | null = null;
  let userName: string | undefined;
  const session = await getServerSession(authOptions);
  if (session?.user) {
    userName = session.user.name?.split(" ")[0];

    if (session.user.activeParishId) {
      const parish = await prisma.parish.findUnique({
        where: { id: session.user.activeParishId },
        select: { name: true, logoUrl: true }
      });
      if (parish?.name) {
        parishName = parish.name;
      }
      parishLogoUrl = parish?.logoUrl ?? null;
    }
  }

  const startGuide =
    session?.user?.id && data.parishRole
      ? (
          <StartThisWeekCard
            userId={session.user.id}
            parishId={data.parishId}
            role={data.parishRole}
            locale={locale}
          />
        )
      : null;

  return viewMode === "admin" ? (
    <ThisWeekAdminView
      data={data}
      locale={locale}
      viewToggle={viewToggle}
      spotlightAdmin={spotlightAdmin}
      parishName={parishName}
      parishLogoUrl={parishLogoUrl}
      userName={userName}
      startGuide={startGuide}
    />
  ) : (
    <ThisWeekParishionerView
      data={data}
      locale={locale}
      weekSelection={weekSelection}
      now={now}
      viewToggle={viewToggle}
      parishName={parishName}
      parishLogoUrl={parishLogoUrl}
      userName={userName}
      startGuide={startGuide}
    />
  );
}
