import Link from "next/link";
import { getServerSession } from "next-auth";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import ListRow from "@/components/ui/ListRow";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const week = await getOrCreateCurrentWeek(parishId);
  const groups = await prisma.group.findMany({
    where: {
      parishId
    },
    orderBy: {
      name: "asc"
    },
    select: {
      id: true,
      name: true,
      description: true,
      memberships: {
        select: {
          id: true
        }
      },
      tasks: {
        where: {
          weekId: week.id
        },
        select: {
          id: true,
          status: true
        }
      }
    }
  });

  return (
    <div className="space-y-6">
      <SectionTitle title="Groups" subtitle={`Week ${week.label}`} />

      <Card>
        <div className="space-y-3">
          {groups.length === 0 ? (
            <p className="text-sm text-ink-500">No groups created yet.</p>
          ) : (
            groups.map((group) => {
              const openTasks = group.tasks.filter((task) => task.status === "OPEN").length;
              const totalTasks = group.tasks.length;
              const membersCount = group.memberships.length;
              const metaParts = [
                `${membersCount} ${membersCount === 1 ? "member" : "members"}`,
                `${totalTasks} task${totalTasks === 1 ? "" : "s"} this week`
              ];
              const meta = metaParts.join(" · ");
              const right = totalTasks === 0 ? "No tasks" : `${openTasks} open`;
              const description = group.description ? `${group.description} · ${meta}` : meta;

              return (
                <Link key={group.id} href={`/groups/${group.id}`} className="block">
                  <ListRow title={group.name} meta={description} right={right} />
                </Link>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
