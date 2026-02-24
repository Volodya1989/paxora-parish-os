import { beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { resolveFromRoot } from "../_helpers/resolve";

const state = {
  findManyArgs: null as Record<string, unknown> | null
};

mock.module(resolveFromRoot("server/auth/permissions"), {
  namedExports: {
    requireAdminOrShepherd: async () => ({ role: "ADMIN" })
  }
});

mock.module(resolveFromRoot("server/db/prisma"), {
  namedExports: {
    prisma: {
      membership: {
        findMany: async (args: Record<string, unknown>) => {
          state.findManyArgs = args;
          return [];
        }
      }
    }
  }
});

beforeEach(() => {
  state.findManyArgs = null;
});

test("getPeopleListForAdmin applies case-insensitive name/email search scoped by parish", async () => {
  const queries = await loadModuleFromRoot<typeof import("@/lib/queries/people")>("lib/queries/people");

  await queries.getPeopleListForAdmin("viewer-1", "parish-1", "John");

  assert.ok(state.findManyArgs);
  assert.deepEqual(state.findManyArgs?.where, {
    parishId: "parish-1",
    OR: [
      {
        user: {
          name: {
            contains: "John",
            mode: "insensitive"
          }
        }
      },
      {
        user: {
          email: {
            contains: "John",
            mode: "insensitive"
          }
        }
      }
    ]
  });
});
