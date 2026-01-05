import { getServerSession } from "next-auth";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek, getWeekEnd } from "@/domain/week";
import { createTask, deferTask, markTaskDone } from "@/server/actions/tasks";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const week = await getOrCreateCurrentWeek(parishId);
  const nextWeekStart = getWeekEnd(week.startsOn);
  const nextWeek = await prisma.week.findUnique({
    where: {
      parishId_startsOn: {
        parishId,
        startsOn: nextWeekStart
      }
    }
  });

  if (!nextWeek) {
    throw new Error("Next week not found");
  }

  const tasks = await prisma.task.findMany({
    where: {
      parishId,
      weekId: week.id,
      ownerId: session.user.id
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      notes: true,
      status: true,
      weekId: true
    }
  });

  return (
    <div className="space-y-6">
      <SectionTitle title="Tasks" subtitle={`Week ${week.label}`} />

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Add task</h2>
        <form className="mt-4 space-y-4" action={createTask}>
          <input type="hidden" name="weekId" value={week.id} />
          <label className="block text-sm text-ink-700">
            Title
            <input
              className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
              type="text"
              name="title"
              required
            />
          </label>
          <label className="block text-sm text-ink-700">
            Notes (optional)
            <textarea
              className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
              name="notes"
              rows={3}
            />
          </label>
          <Button type="submit">Create task</Button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">This week</h2>
          <p className="text-sm text-ink-500">{tasks.length} tasks</p>
        </div>
        <div className="mt-4 space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-ink-500">No tasks yet for this week.</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-md border border-mist-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">{task.title}</p>
                  {task.notes ? <p className="mt-1 text-sm text-ink-500">{task.notes}</p> : null}
                  <p className="mt-1 text-xs text-ink-400">
                    {task.status === "DONE" ? "Completed" : "Open"}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <form action={markTaskDone}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <Button type="submit" className="px-3 py-1 text-xs" disabled={task.status === "DONE"}>
                      Mark done
                    </Button>
                  </form>
                  <form action={deferTask} className="flex items-center gap-2">
                    <input type="hidden" name="taskId" value={task.id} />
                    <select
                      name="targetWeekId"
                      defaultValue={nextWeek.id}
                      className="rounded-md border border-mist-200 bg-white px-2 py-1 text-xs"
                    >
                      <option value={week.id}>This week</option>
                      <option value={nextWeek.id}>Next week</option>
                    </select>
                    <Button type="submit" className="px-3 py-1 text-xs">
                      Defer
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
