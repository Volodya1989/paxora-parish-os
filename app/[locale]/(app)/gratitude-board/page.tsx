import { getServerSession } from "next-auth";
import PageShell from "@/components/app/page-shell";
import Card from "@/components/ui/Card";
import { authOptions } from "@/server/auth/options";
import { getHoursLeaderboards, getHoursSummary } from "@/lib/queries/hours";
import { getGratitudeSpotlight } from "@/lib/queries/gratitude";
import HoursSummaryCard from "@/components/hours/HoursSummaryCard";
import HoursLeaderboardCard from "@/components/hours/HoursLeaderboardCard";
import GratitudeSpotlightCard from "@/components/gratitude/GratitudeSpotlightCard";
import GratitudeSettingsPanel from "@/components/hours/GratitudeSettingsPanel";
import GratitudeSpotlightAdminPanel from "@/components/this-week/admin/GratitudeSpotlightAdminPanel";
import { getParishMembership, isCoordinatorInParish } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { prisma } from "@/server/db/prisma";
import PageHeader from "@/components/header/PageHeader";
import { getGratitudeAdminData } from "@/lib/queries/gratitude";
import { getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GratitudeBoardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const summary = await getHoursSummary({ parishId });
  const [leaderboards, spotlight, membership, coordinator, parishSettings, adminData] = await Promise.all([
    getHoursLeaderboards({ parishId }),
    getGratitudeSpotlight({ parishId, weekId: summary.week.id }),
    getParishMembership(parishId, session.user.id),
    isCoordinatorInParish(parishId, session.user.id),
    prisma.parish.findUnique({
      where: { id: parishId },
      select: {
        gratitudeSpotlightEnabled: true,
        gratitudeSpotlightLimit: true,
        bronzeHours: true,
        silverHours: true,
        goldHours: true
      }
    }),
    getGratitudeAdminData({ parishId, weekId: summary.week.id })
  ]);

  if (!membership || !parishSettings) {
    throw new Error("Unauthorized");
  }

  const canManage = isParishLeader(membership.role) || coordinator;
  const canManageSettings = isParishLeader(membership.role);

  return (
    <div className="section-gap">
      <PageShell
        title={t("gratitudeBoard.title")}
        description={t("gratitudeBoard.description")}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <HoursSummaryCard weekTotal={summary.weekTotal} monthTotal={summary.monthTotal} />
        <GratitudeSpotlightCard
          enabled={spotlight.enabled}
          limit={spotlight.limit}
          items={spotlight.items}
        />
      </div>

      <Card className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">{t("gratitudeBoard.groupBreakdownTitle")}</p>
          <p className="text-xs text-ink-500">{t("gratitudeBoard.groupBreakdownDescription")}</p>
        </div>
        {summary.groupBreakdown.length ? (
          <ul className="space-y-2 text-sm text-ink-700">
            {summary.groupBreakdown.map((group) => (
              <li
                key={group.groupId}
                className="flex items-center justify-between rounded-card border border-mist-100 bg-mist-50 px-3 py-2"
              >
                <span>{group.groupName}</span>
                <span className="text-xs font-semibold text-ink-600">
                  {group.hours.toFixed(1)} {t("gratitudeBoard.hoursAbbrev")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">{t("gratitudeBoard.noGroupHours")}</p>
        )}
      </Card>

      <HoursLeaderboardCard
        weekLeaders={leaderboards.week}
        monthLeaders={leaderboards.month}
      />

      {canManage ? (
        <GratitudeSpotlightAdminPanel
          weekId={summary.week.id}
          settings={adminData.settings}
          nominations={adminData.nominations}
          memberOptions={adminData.memberOptions}
        />
      ) : null}

      {canManageSettings ? (
        <GratitudeSettingsPanel
          enabled={parishSettings.gratitudeSpotlightEnabled}
          limit={parishSettings.gratitudeSpotlightLimit}
          bronzeHours={parishSettings.bronzeHours}
          silverHours={parishSettings.silverHours}
          goldHours={parishSettings.goldHours}
        />
      ) : null}
    </div>
  );
}
