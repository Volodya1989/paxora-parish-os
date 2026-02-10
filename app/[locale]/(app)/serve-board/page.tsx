import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getParishMembership } from "@/server/db/groups";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { listTasks } from "@/lib/queries/tasks";
import { getUserYtdHours } from "@/lib/queries/hours";
import { getMilestoneTier } from "@/lib/hours/milestones";
import { isParishLeader } from "@/lib/permissions";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import ServeBoardView from "@/components/serve-board/ServeBoardView";
import VolunteerHoursSummary from "@/components/serve-board/VolunteerHoursSummary";
import { HandHeartIcon } from "@/components/icons/ParishIcons";
import { getTranslator } from "@/lib/i18n/translator";
import { getLocaleFromParam } from "@/lib/i18n/routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getDisplayName(name: string | null, email: string | null) {
  return name ?? email?.split("@")[0] ?? "Member";
}

export default async function ServeBoardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslator(locale);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const membership = await getParishMembership(parishId, session.user.id);
  if (!membership) {
    throw new Error("Unauthorized");
  }

  const week = await getOrCreateCurrentWeek(parishId, getNow());
  const isLeader = isParishLeader(membership.role);

  const [taskList, members, parish, ytdHours] = await Promise.all([
    listTasks({
      parishId,
      actorUserId: session.user.id,
      weekId: week.id,
      viewMode: "all"
    }),
    prisma.membership.findMany({
      where: { parishId },
      orderBy: { user: { name: "asc" } },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.parish.findUnique({
      where: { id: parishId },
      select: { name: true, logoUrl: true, bronzeHours: true, silverHours: true, goldHours: true }
    }),
    getUserYtdHours({ parishId, userId: session.user.id })
  ]);

  const milestoneTier = getMilestoneTier({
    ytdHours,
    bronzeHours: parish?.bronzeHours ?? 10,
    silverHours: parish?.silverHours ?? 25,
    goldHours: parish?.goldHours ?? 50
  });

  const memberOptions = members.map((member) => {
    const name = getDisplayName(member.user.name, member.user.email);
    return {
      id: member.user.id,
      name,
      label: member.user.email ? `${name} · ${member.user.email}` : name
    };
  });

  return (
    <ParishionerPageLayout
      pageTitle={t("nav.serve")}
      parishName={parish?.name ?? t("serve.myParish")}
      parishLogoUrl={parish?.logoUrl ?? null}
      isLeader={isLeader}
      subtitle={t("serve.subtitle")}
      gradientClass="from-sky-500 via-sky-400 to-cyan-500"
      icon={<HandHeartIcon className="h-6 w-6 text-white" />}
    >
      <VolunteerHoursSummary ytdHours={ytdHours} tier={milestoneTier} />
      <ServeBoardView
        tasks={taskList.tasks}
        memberOptions={memberOptions}
        currentUserId={session.user.id}
        isLeader={isLeader}
      />
    </ParishionerPageLayout>
  );
}
