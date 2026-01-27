import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { listTasks, listPendingTaskApprovals } from "@/lib/queries/tasks";
import { getPendingAccessRequests } from "@/lib/queries/access";
import { approveParishAccess, rejectParishAccess } from "@/app/actions/access";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { isAdminClergy } from "@/lib/authz/membership";
import TasksView from "@/components/tasks/TasksView";

type GroupTasksPageProps = {
  params: Promise<{
    groupId: string;
  }>;
};

function formatDateRange(startsOn: Date, endsOn: Date) {
  const start = startsOn.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  const end = new Date(endsOn.getTime() - 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  return `${start} – ${end}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getDisplayName(name: string | null, email: string | null) {
  return name ?? email?.split("@")[0] ?? "Member";
}

export default async function GroupTasksPage({ params }: GroupTasksPageProps) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const actorUserId = session.user.id;

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      parishId
    },
    select: {
      id: true,
      name: true,
      visibility: true
    }
  });

  if (!group) {
    throw new Error("Group not found");
  }

  const [parishMembership, groupMembership] = await Promise.all([
    prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId,
          userId: actorUserId
        }
      },
      select: { role: true }
    }),
    prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: actorUserId
        }
      },
      select: { status: true }
    })
  ]);

  if (!parishMembership) {
    throw new Error("Unauthorized");
  }

  const canView =
    group.visibility === "PUBLIC" ||
    groupMembership?.status === "ACTIVE" ||
    isAdminClergy(parishMembership.role);

  if (!canView) {
    throw new Error("Unauthorized");
  }

  const week = await getOrCreateCurrentWeek(parishId, getNow());

  const [taskList, members, pendingRequests, pendingTaskApprovals] = await Promise.all([
    listTasks({
      parishId,
      actorUserId,
      weekId: week.id,
      filters: {
        status: "all",
        ownership: "all",
        groupId: group.id
      }
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
    getPendingAccessRequests(),
    listPendingTaskApprovals({
      parishId,
      actorUserId,
      weekId: week.id
    })
  ]);

  const memberOptions = members.map((membership) => {
    const name = getDisplayName(membership.user.name, membership.user.email);
    return {
      id: membership.user.id,
      name,
      initials: getInitials(name)
    };
  });

  return (
    <TasksView
      title="Opportunities to Help"
      description={`Coordinate service opportunities for this group. ${formatDateRange(
        week.startsOn,
        week.endsOn
      )}`}
      ctaLabel="Add opportunity"
      weekLabel={week.label}
      weekRange={formatDateRange(week.startsOn, week.endsOn)}
      weekId={week.id}
      tasks={taskList.tasks}
      summary={taskList.summary}
      filteredCount={taskList.filteredCount}
      filters={taskList.filters}
      groupOptions={[{ id: group.id, name: group.name }]}
      memberOptions={memberOptions}
      currentUserId={actorUserId}
      pendingAccessRequests={pendingRequests}
      pendingTaskApprovals={pendingTaskApprovals}
      approveAccessAction={approveParishAccess}
      rejectAccessAction={rejectParishAccess}
    />
  );
}
