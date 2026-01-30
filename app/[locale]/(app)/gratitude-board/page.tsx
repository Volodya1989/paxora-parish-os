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
import { getParishMembership, isCoordinatorInParish } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GratitudeBoardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const summary = await getHoursSummary({ parishId });
  const [leaderboards, spotlight, membership, coordinator, parishSettings] = await Promise.all([
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
    })
  ]);

  if (!membership || !parishSettings) {
    throw new Error("Unauthorized");
  }

  const canManage = isParishLeader(membership.role) || coordinator;
  const canManageSettings = isParishLeader(membership.role);

  return (
    <div className="section-gap">
      <PageShell
        title="Hours & Gratitude Board"
        description="Celebrate the week’s hours offered and gratitude highlights."
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
          <p className="text-sm font-semibold text-ink-900">Group breakdown</p>
          <p className="text-xs text-ink-500">Hours shared by ministry this week.</p>
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
                  {group.hours.toFixed(1)} hrs
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">No group hours logged yet this week.</p>
        )}
      </Card>

      <HoursLeaderboardCard
        weekLeaders={leaderboards.week}
        monthLeaders={leaderboards.month}
      />

      {canManage ? (
        <Card className="space-y-2 border border-dashed border-mist-200 bg-mist-50/50 p-4 text-xs text-ink-500">
          Manage nominations from the This Week admin view.
        </Card>
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
