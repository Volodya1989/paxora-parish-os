import { after, test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadModuleFromRoot } from "../_helpers/load-module";

after(() => {
  mock.restoreAll();
});

const requireCalls: Array<{ userId: string; parishId: string }> = [];
let shouldReject = false;

mock.module("@/server/auth/permissions", {
  namedExports: {
    requireAdminOrShepherd: async (userId: string, parishId: string) => {
      requireCalls.push({ userId, parishId });
      if (shouldReject) {
        throw new Error("Forbidden");
      }
      return { role: "ADMIN" };
    }
  }
});

mock.module("@/server/db/prisma", {
  namedExports: {
    prisma: {
      membership: {
        findMany: async () => [
          {
            id: "member-1",
            role: "SHEPHERD",
            user: {
              id: "user-1",
              name: "Clergy",
              email: "clergy@example.com",
              lastLoginAt: new Date("2026-02-13T18:42:00.000Z")
            }
          },
          {
            id: "member-2",
            role: "MEMBER",
            user: {
              id: "user-2",
              name: "Parishioner",
              email: "member@example.com",
              lastLoginAt: null
            }
          }
        ]
      }
    }
  }
});

test("PeopleView includes a Last login field with Never fallback", async () => {
  const source = await readFile("components/admin/people/PeopleView.tsx", "utf8");

  assert.match(source, /Last login:/);
  assert.match(source, /return "Never"/);
});

test("getPeopleListForAdmin includes lastLoginAt for authorized clergy/admin", async () => {
  shouldReject = false;
  requireCalls.length = 0;

  const queries = await loadModuleFromRoot<typeof import("@/lib/queries/people")>("lib/queries/people");
  const members = await queries.getPeopleListForAdmin("viewer-1", "parish-1");

  assert.equal(members.length, 2);
  assert.equal(members[0]?.lastLoginAt?.toISOString(), "2026-02-13T18:42:00.000Z");
  assert.equal(members[1]?.lastLoginAt, null);
  assert.deepEqual(requireCalls, [{ userId: "viewer-1", parishId: "parish-1" }]);
});

test("getPeopleListForAdmin rejects parishioner access", async () => {
  shouldReject = true;

  const queries = await loadModuleFromRoot<typeof import("@/lib/queries/people")>("lib/queries/people");

  await assert.rejects(
    async () => {
      await queries.getPeopleListForAdmin("viewer-2", "parish-1");
    },
    /Forbidden/
  );
});
