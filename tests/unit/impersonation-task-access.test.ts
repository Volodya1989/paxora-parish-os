import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { resolveFromRoot } from "../_helpers/resolve";

afterEach(() => {
  mock.restoreAll();
});

test("listPendingTaskApprovals treats impersonating super admin as parish leader", async () => {
  mock.module(resolveFromRoot("server/db/groups"), {
    namedExports: {
      getParishMembership: async () => ({
        id: "virtual-impersonation:parish-1:user-1",
        role: "ADMIN"
      })
    }
  });

  mock.module(resolveFromRoot("server/db/prisma"), {
    namedExports: {
      prisma: {
        task: {
          findMany: async () => [
            {
              id: "task-1",
              displayId: "T-1",
              title: "Pending task",
              notes: null,
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              owner: null,
              createdBy: {
                id: "creator-1",
                name: "Creator",
                email: "creator@example.com",
                memberships: [{ role: "MEMBER" }]
              },
              group: null
            }
          ]
        }
      }
    }
  });

  const { listPendingTaskApprovals } = await loadModuleFromRoot<typeof import("@/lib/queries/tasks")>(
    "lib/queries/tasks"
  );

  const approvals = await listPendingTaskApprovals({
    parishId: "parish-1",
    actorUserId: "user-1",
    weekId: "week-1"
  });

  assert.equal(approvals.length, 1);
  assert.equal(approvals[0]?.id, "task-1");
});
