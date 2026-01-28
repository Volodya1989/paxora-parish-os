import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getParishMembership } from "@/server/db/groups";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { listTasks } from "@/lib/queries/tasks";
import { isParishLeader } from "@/lib/permissions";
import ServeBoardView from "@/components/serve-board/ServeBoardView";

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
  const [taskList, members] = await Promise.all([
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
    })
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
    <ServeBoardView
      tasks={taskList.tasks}
      memberOptions={memberOptions}
      currentUserId={session.user.id}
      isLeader={isParishLeader(membership.role)}
    />
  );
}
