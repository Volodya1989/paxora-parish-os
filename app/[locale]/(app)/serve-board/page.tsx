import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getParishMembership } from "@/server/db/groups";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { listTasks } from "@/lib/queries/tasks";
import { getProfileSettings } from "@/lib/queries/profile";
import { isParishLeader } from "@/lib/permissions";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import VolunteerHoursCard from "@/components/profile/VolunteerHoursCard";
import ServeBoardView from "@/components/serve-board/ServeBoardView";
import { HandHeartIcon, HeartIcon } from "@/components/icons/ParishIcons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getDisplayName(name: string | null, email: string | null) {
  return name ?? email?.split("@")[0] ?? "Member";
}

export default async function ServeBoardPage() {
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

  const [taskList, members, parish, profile] = await Promise.all([
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
      select: { name: true }
    }),
    getProfileSettings({ userId: session.user.id, parishId })
  ]);

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
      pageTitle="Serve"
      parishName={parish?.name ?? "My Parish"}
      isLeader={isLeader}
      subtitle="Find opportunities to live your faith in action"
      gradientClass="from-sky-500 via-sky-400 to-cyan-500"
      icon={<HandHeartIcon className="h-6 w-6 text-white" />}
    >
      <div className="w-full md:ml-auto md:max-w-md">
        <VolunteerHoursCard
          ytdHours={profile.ytdHours}
          tier={profile.milestoneTier}
          bronzeHours={profile.bronzeHours}
          silverHours={profile.silverHours}
          goldHours={profile.goldHours}
        />
      </div>
      <ServeBoardView
        tasks={taskList.tasks}
        memberOptions={memberOptions}
        currentUserId={session.user.id}
        isLeader={isLeader}
      />
    </ParishionerPageLayout>
  );
}
