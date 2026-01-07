import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { loadModuleFromRoot } from "../../_helpers/load-module";
import { resolveFromRoot } from "../../_helpers/resolve";
const mockModule = (mock as any).module.bind(mock) as (
  specifier: string,
  options: { namedExports?: Record<string, unknown> }
) => void;
let session = {
  user: {
    id: "user-1",
    activeParishId: "parish-1"
  }
};

const prisma = {
  task: {
    findUnique: async () => null,
    update: async () => ({})
  },
  membership: {
    findUnique: async () => null
  }
};

mockModule(resolveFromRoot("server/db/prisma"), {
  namedExports: {
    prisma
  }
});

mockModule("next-auth", {
  namedExports: {
    getServerSession: async () => session
  }
});

mockModule("next/cache", {
  namedExports: {
    revalidatePath: () => {}
  }
});

afterEach(() => {
  mock.restoreAll();
});

test("createTask rejects missing title or invalid weekId", async () => {
  const { createTask } = await loadModuleFromRoot<typeof import("@/server/actions/tasks")>(
    "server/actions/tasks"
  );
  const missingTitle = new FormData();
  missingTitle.set("title", "");
  missingTitle.set("weekId", "week-1");

  await assert.rejects(() => createTask(missingTitle), /Title is required/);

  const invalidWeek = new FormData();
  invalidWeek.set("title", "Task title");
  invalidWeek.set("weekId", "");

  await assert.rejects(() => createTask(invalidWeek), /Expected string/);
});

test("markTaskDone denies non-owner unless parish leader", async () => {
  const { markTaskDone } = await loadModuleFromRoot<typeof import("@/server/actions/tasks")>(
    "server/actions/tasks"
  );
  const task = {
    id: "task-1",
    ownerId: "user-1",
    parishId: "parish-1"
  };

  prisma.task.findUnique = async () => task as any;
  let updatedTask: typeof task & { status?: string; completedAt?: Date | null } | undefined;
  prisma.task.update = async ({ data }: any) => {
    updatedTask = {
      ...task,
      status: data.status,
      completedAt: data.completedAt
    };
    return updatedTask as any;
  };

  session = {
    user: {
      id: "user-2",
      activeParishId: "parish-1"
    }
  };

  prisma.membership.findUnique = async () => ({ role: "MEMBER" } as any);

  const formData = new FormData();
  formData.set("taskId", task.id);

  await assert.rejects(() => markTaskDone(formData), /Forbidden/);

  session = {
    user: {
      id: "user-1",
      activeParishId: "parish-1"
    }
  };

  await markTaskDone(formData);
  assert.equal(updatedTask?.status, "DONE");
  assert.ok(updatedTask?.completedAt);
});
