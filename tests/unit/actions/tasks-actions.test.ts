import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { prisma } from "@/server/db/prisma";

const mockModule = (mock as unknown as { module: (specifier: string, factory: () => unknown) => void })
  .module;

let session = {
  user: {
    id: "user-1",
    activeParishId: "parish-1"
  }
};

mockModule("next-auth", () => ({
  getServerSession: async () => session
}));

mockModule("next/cache", () => ({
  revalidatePath: () => {}
}));

const { createTask, markTaskDone } = await import("@/server/actions/tasks");

afterEach(() => {
  mock.restoreAll();
});

test("createTask rejects missing title or invalid weekId", async () => {
  const missingTitle = new FormData();
  missingTitle.set("title", "");
  missingTitle.set("weekId", "week-1");

  await assert.rejects(() => createTask(missingTitle), /Title is required/);

  const invalidWeek = new FormData();
  invalidWeek.set("title", "Task title");
  invalidWeek.set("weekId", "");

  await assert.rejects(() => createTask(invalidWeek), /Invalid input/);
});

test("markTaskDone denies non-owner unless parish leader", async () => {
  const task = {
    id: "task-1",
    ownerId: "user-1",
    parishId: "parish-1"
  };

  mock.method(prisma.task, "findUnique", async () => task as any);
  let updatedTask: typeof task & { status?: string; completedAt?: Date | null } | undefined;
  mock.method(prisma.task, "update", async ({ data }: any) => {
    updatedTask = {
      ...task,
      status: data.status,
      completedAt: data.completedAt
    };
    return updatedTask as any;
  });

  session = {
    user: {
      id: "user-2",
      activeParishId: "parish-1"
    }
  };

  mock.method(prisma.membership, "findUnique", async () => ({ role: "MEMBER" } as any));

  const formData = new FormData();
  formData.set("taskId", task.id);

  await assert.rejects(() => markTaskDone(formData), /Forbidden/);

  mock.method(prisma.membership, "findUnique", async () => ({ role: "ADMIN" } as any));

  await markTaskDone(formData);
  assert.equal(updatedTask?.status, "DONE");
  assert.ok(updatedTask?.completedAt);
});
