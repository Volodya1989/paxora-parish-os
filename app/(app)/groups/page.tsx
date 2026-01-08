import Link from "next/link";
import { getServerSession } from "next-auth";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import ListRow from "@/components/ui/ListRow";
import Button from "@/components/ui/Button";
import { ScrollToCreate } from "@/components/shared/ScrollToCreate";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { createGroup } from "@/server/actions/groups";

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

      <Card id="create-group" tabIndex={-1}>
        <ScrollToCreate targetId="create-group" triggerValue="group" />
        <h2 className="text-lg font-semibold text-ink-900">Create group</h2>
        <form className="mt-4 space-y-4" action={createGroup}>
          <label className="block text-sm text-ink-700">
            Group name
            <input
              className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
              type="text"
              name="name"
              required
            />
          </label>
          <label className="block text-sm text-ink-700">
            Description (optional)
            <textarea
              className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
              name="description"
              rows={3}
            />
          </label>
          <Button type="submit">Create group</Button>
        </form>
      </Card>

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
