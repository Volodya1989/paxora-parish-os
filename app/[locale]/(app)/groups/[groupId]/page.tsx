import Link from "next/link";
import { getServerSession } from "next-auth";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import ListRow from "@/components/ui/ListRow";
import Badge from "@/components/ui/Badge";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { isAdminClergy } from "@/lib/authz/membership";

type GroupDetailPageProps = {
  params: Promise<{
    groupId: string;
  }>;
};

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const actorUserId = session.user.id;
  const week = await getOrCreateCurrentWeek(parishId);
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      parishId
    },
    select: {
      id: true,
      name: true,
      description: true,
      visibility: true,
      joinPolicy: true,
      status: true,
      createdById: true,
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: {
          user: {
            name: "asc"
          }
        },
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
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

  const isLeader = parishMembership && isAdminClergy(parishMembership.role);
  const canView =
    (group.status === "ACTIVE" &&
      ((group.visibility === "PUBLIC" && Boolean(parishMembership)) ||
        groupMembership?.status === "ACTIVE" ||
        isLeader)) ||
    (group.status !== "ACTIVE" && (isLeader || group.createdById === actorUserId));

  if (!canView) {
    throw new Error("Unauthorized");
  }

  const canAccessChat = groupMembership?.status === "ACTIVE";
  const canViewMembers = groupMembership?.status === "ACTIVE" || isLeader;

  const tasks = await prisma.task.findMany({
    where: {
      parishId,
      groupId: group.id,
      weekId: week.id,
      archivedAt: null,
      AND: [
        {
          OR: [
            { visibility: "PUBLIC", approvalStatus: "APPROVED" },
            { ownerId: actorUserId },
            { createdById: actorUserId }
          ]
        }
      ]
    },
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true,
      title: true,
      status: true,
      owner: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle title={group.name} subtitle={group.description ?? `Week ${week.label}`} />
        <div className="flex flex-wrap items-center gap-3">
          {canAccessChat ? (
            <Link
              className="text-sm font-medium text-ink-900 underline"
              href={`/groups/${group.id}/chat`}
            >
              Group chat
            </Link>
          ) : null}
          {canViewMembers ? (
            <Link
              className="text-sm font-medium text-ink-900 underline"
              href={`/groups/${group.id}/members`}
            >
              Manage members
            </Link>
          ) : null}
          <Link className="text-sm font-medium text-ink-900 underline" href="/groups">
            Back to groups
          </Link>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Members</h2>
          <p className="text-sm text-ink-500">{group.memberships.length} total</p>
        </div>
        <div className="mt-4 space-y-2">
          {group.memberships.length === 0 ? (
            <p className="text-sm text-ink-500">No members added yet.</p>
          ) : (
            group.memberships.map((membership) => (
              <div
                key={membership.id}
                className="flex flex-col gap-1 rounded-md border border-mist-200 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink-900">
                    {membership.user.name ?? membership.user.email}
                  </p>
                  <Badge tone={membership.role === "COORDINATOR" ? "success" : "neutral"}>
                    {membership.role === "COORDINATOR" ? "Coordinator" : "Parishioner"}
                  </Badge>
                </div>
                <p className="text-xs text-ink-500">{membership.user.email}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Opportunities to Help</h2>
          <p className="text-sm text-ink-500">Week {week.label}</p>
        </div>
        <div className="mt-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-ink-500">
              No service opportunities are scheduled for this group this week.
            </p>
          ) : (
            tasks.map((task) => (
              <ListRow
                key={task.id}
                title={task.title}
                meta={`${
                  task.status === "DONE"
                    ? "Completed"
                    : task.status === "IN_PROGRESS"
                      ? "In progress"
                      : "Open"
                } · ${task.owner?.name ?? task.owner?.email ?? "Unassigned"}`}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
