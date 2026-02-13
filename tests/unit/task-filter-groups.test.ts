import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";

const findManyCalls: unknown[] = [];

mock.module("@/server/db/prisma", {
  namedExports: {
    prisma: {
      group: {
        findMany: async (args: unknown) => {
          findManyCalls.push(args);
          return [];
        }
      }
    }
  }
});

test("listTaskFilterGroups applies active membership filter for members", async () => {
  findManyCalls.length = 0;
  const groupsDb = await loadModuleFromRoot<any>("server/db/groups");

  await groupsDb.listTaskFilterGroups({ parishId: "parish-1", userId: "user-1", role: "MEMBER" });

  assert.equal(findManyCalls.length, 1);
  const args = findManyCalls[0] as any;
  assert.equal(args.where.parishId, "parish-1");
  assert.equal(args.where.memberships.some.userId, "user-1");
  assert.equal(args.where.memberships.some.status, "ACTIVE");
});
