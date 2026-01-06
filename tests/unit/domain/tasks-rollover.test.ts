import { test } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { buildTask } from "@/tests/unit/helpers/builders";

const mockModule = mock.module.bind(mock) as (
  specifier: string,
  options: { namedExports?: Record<string, unknown> }
) => void;

const prisma = {
  task: {
    findMany: async () => [],
    createMany: async () => ({ count: 0 })
  }
};

mockModule("@/server/db/prisma", {
  namedExports: {
    prisma
  }
});

const loadTasksModule = () => import("@/domain/tasks");

test("rollover creates new tasks for open items and is idempotent", async () => {
  const parishId = "parish-1";
  const fromWeekId = "week-1";
  const toWeekId = "week-2";

  const tasks = [
    buildTask({
      id: "task-open",
      parishId,
      weekId: fromWeekId,
      ownerId: "owner-1",
      title: "Follow up",
      status: "OPEN"
    }),
    buildTask({
      id: "task-done",
      parishId,
      weekId: fromWeekId,
      ownerId: "owner-1",
      title: "Done task",
      status: "DONE"
    })
  ];

  const originalFindMany = prisma.task.findMany;
  const originalCreateMany = prisma.task.createMany;

  prisma.task.findMany = async ({ where, select }: any) => {
    if (where?.rolledFromTaskId?.in) {
      const rolled = tasks.filter(
        (task) =>
          task.weekId === where.weekId &&
          task.rolledFromTaskId &&
          where.rolledFromTaskId.in.includes(task.rolledFromTaskId)
      );
      return rolled.map((task) => ({ rolledFromTaskId: task.rolledFromTaskId }));
    }

    const openTasks = tasks.filter(
      (task) => task.parishId === where.parishId && task.weekId === where.weekId
    );
    return openTasks
      .filter((task) => task.status === where.status)
      .map((task) => {
        if (!select) {
          return task;
        }
        return {
          id: task.id,
          title: task.title,
          notes: task.notes,
          ownerId: task.ownerId,
          groupId: task.groupId
        };
      });
  };

  prisma.task.createMany = async ({ data }: any) => {
    data.forEach((task: any) => {
      tasks.push({
        id: `task-${tasks.length + 1}`,
        parishId: task.parishId,
        weekId: task.weekId,
        ownerId: task.ownerId,
        title: task.title,
        notes: task.notes ?? null,
        groupId: task.groupId ?? null,
        status: "OPEN",
        rolledFromTaskId: task.rolledFromTaskId
      });
    });
    return { count: data.length };
  };

  const { rolloverOpenTasks } = await loadTasksModule();
  const firstCount = await rolloverOpenTasks({ parishId, fromWeekId, toWeekId });

  assert.equal(firstCount, 1);
  const rolled = tasks.find((task) => task.rolledFromTaskId === "task-open");
  assert.ok(rolled);
  assert.equal(tasks.find((task) => task.id === "task-open")?.status, "OPEN");

  const secondCount = await rolloverOpenTasks({ parishId, fromWeekId, toWeekId });
  assert.equal(secondCount, 0);

  prisma.task.findMany = originalFindMany;
  prisma.task.createMany = originalCreateMany;
});

test("rollover skips already-rolled tasks and preserves rolledFromTaskId", async () => {
  const parishId = "parish-1";
  const fromWeekId = "week-1";
  const toWeekId = "week-2";

  const tasks = [
    buildTask({
      id: "task-open-1",
      parishId,
      weekId: fromWeekId,
      ownerId: "owner-1",
      title: "First open",
      status: "OPEN"
    }),
    buildTask({
      id: "task-open-2",
      parishId,
      weekId: fromWeekId,
      ownerId: "owner-2",
      title: "Second open",
      status: "OPEN"
    }),
    buildTask({
      id: "task-rolled",
      parishId,
      weekId: toWeekId,
      ownerId: "owner-1",
      title: "First open",
      status: "OPEN",
      rolledFromTaskId: "task-open-1"
    })
  ];

  const originalFindMany = prisma.task.findMany;
  const originalCreateMany = prisma.task.createMany;

  prisma.task.findMany = async ({ where, select }: any) => {
    if (where?.rolledFromTaskId?.in) {
      return tasks
        .filter(
          (task) =>
            task.weekId === where.weekId &&
            task.rolledFromTaskId &&
            where.rolledFromTaskId.in.includes(task.rolledFromTaskId)
        )
        .map((task) => ({ rolledFromTaskId: task.rolledFromTaskId }));
    }

    return tasks
      .filter((task) => task.parishId === where.parishId && task.weekId === where.weekId)
      .filter((task) => task.status === where.status)
      .map((task) => ({
        id: task.id,
        title: task.title,
        notes: task.notes,
        ownerId: task.ownerId,
        groupId: task.groupId
      }));
  };

  let createdTasks: Array<{ rolledFromTaskId: string }> = [];
  prisma.task.createMany = async ({ data }: any) => {
    createdTasks = data;
    return { count: data.length };
  };

  const { rolloverOpenTasks } = await loadTasksModule();
  const count = await rolloverOpenTasks({ parishId, fromWeekId, toWeekId });

  assert.equal(count, 1);
  assert.equal(createdTasks.length, 1);
  assert.equal(createdTasks[0].rolledFromTaskId, "task-open-2");

  prisma.task.findMany = originalFindMany;
  prisma.task.createMany = originalCreateMany;
});
