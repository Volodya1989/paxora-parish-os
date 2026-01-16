import Link from "next/link";
import { getServerSession } from "next-auth";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import ListRow from "@/components/ui/ListRow";
import Badge from "@/components/ui/Badge";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";

type GroupDetailPageProps = {
  params: {
    groupId: string;
  };
};

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const actorUserId = session.user.id;
  const week = await getOrCreateCurrentWeek(parishId);
  const group = await prisma.group.findFirst({
    where: {
      id: params.groupId,
      parishId
    },
    select: {
      id: true,
      name: true,
      description: true,
      memberships: {
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
        <Link className="text-sm font-medium text-ink-900 underline" href="/groups">
          Back to groups
        </Link>
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
                  <Badge tone={membership.role === "LEAD" ? "success" : "neutral"}>
                    {membership.role === "LEAD" ? "Lead" : "Member"}
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
          <h2 className="text-lg font-semibold text-ink-900">This week&apos;s tasks</h2>
          <p className="text-sm text-ink-500">Week {week.label}</p>
        </div>
        <div className="mt-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-ink-500">No tasks assigned to this group this week.</p>
          ) : (
            tasks.map((task) => (
              <ListRow
                key={task.id}
                title={task.title}
                meta={`${task.status === "DONE" ? "Completed" : "Open"} · ${
                  task.owner.name ?? task.owner.email
                }`}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
