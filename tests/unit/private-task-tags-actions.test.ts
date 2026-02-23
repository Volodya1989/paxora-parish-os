import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";

const state = {
  task: {
    id: "task-1",
    parishId: "parish-1",
    visibility: "PRIVATE",
    ownerId: "user-1",
    createdById: "user-1"
  },
  ownedTagIds: ["tag-1", "tag-2"]
};

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => ({ user: { id: "user-1", activeParishId: "parish-1" } })
  }
});

mock.module("@/server/auth/options", { namedExports: { authOptions: {} } });
mock.module("next/cache", { namedExports: { revalidatePath: () => undefined } });

const createManyCalls: Array<{ taskId: string; userTagId: string }[]> = [];
const deleteManyCalls: Array<{ taskId: string; userTagId: { in: string[] } }> = [];

mock.module("@/server/db/prisma", {
  namedExports: {
    prisma: {
      task: {
        findUnique: async () => state.task
      },
      userTag: {
        findMany: async ({ where }: any) => {
          const requested: string[] = where.id.in;
          return state.ownedTagIds.filter((id) => requested.includes(id)).map((id) => ({ id }));
        }
      },
      taskUserTag: {
        createMany: async ({ data }: any) => {
          createManyCalls.push(data);
          return { count: data.length };
        },
        deleteMany: async ({ where }: any) => {
          deleteManyCalls.push(where);
          return { count: where.userTagId.in.length };
        }
      },
      $transaction: async (fn: any) => fn({
        taskUserTag: {
          createMany: async ({ data }: any) => {
            createManyCalls.push(data);
            return { count: data.length };
          },
          deleteMany: async ({ where }: any) => {
            deleteManyCalls.push(where);
            return { count: where.userTagId.in.length };
          }
        }
      })
    }
  }
});

test("updatePrivateTaskTags applies add/remove operations for owned tags", async () => {
  createManyCalls.length = 0;
  deleteManyCalls.length = 0;
  const actions = await loadModuleFromRoot<any>("server/actions/tasks");

  await actions.updatePrivateTaskTags({
    taskId: "task-1",
    addTagIds: ["tag-1"],
    removeTagIds: ["tag-2"]
  });

  assert.equal(createManyCalls.length, 1);
  assert.deepEqual(createManyCalls[0], [{ taskId: "task-1", userTagId: "tag-1" }]);
  assert.equal(deleteManyCalls.length, 1);
  assert.deepEqual(deleteManyCalls[0], { taskId: "task-1", userTagId: { in: ["tag-2"] } });
});

test("updatePrivateTaskTags rejects tags not owned by current user", async () => {
  const actions = await loadModuleFromRoot<any>("server/actions/tasks");
  await assert.rejects(
    () => actions.updatePrivateTaskTags({ taskId: "task-1", addTagIds: ["tag-x"] }),
    /Invalid tag selection/
  );
});
