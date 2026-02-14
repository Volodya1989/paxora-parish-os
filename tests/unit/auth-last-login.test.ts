import { after, test, mock } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { resolveFromRoot } from "../_helpers/resolve";

after(() => {
  mock.restoreAll();
});

const updateCalls: Array<{ where: { id: string }; data: { lastLoginAt: Date } }> = [];
const bootstrapCalls: string[] = [];

mock.module(resolveFromRoot("server/db/prisma"), {
  namedExports: {
    prisma: {
      user: {
        findUnique: async () => null,
        update: async (args: { where: { id: string }; data: { lastLoginAt: Date } }) => {
          updateCalls.push(args);
          return { id: args.where.id };
        }
      }
    }
  }
});

mock.module(resolveFromRoot("server/auth/bootstrap"), {
  namedExports: {
    ensureParishBootstrap: async (userId: string) => {
      bootstrapCalls.push(userId);
    }
  }
});

test("auth signIn callback updates user.lastLoginAt on successful login", async () => {
  updateCalls.length = 0;
  bootstrapCalls.length = 0;

  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );

  const result = await authOptions.callbacks?.signIn?.({
    user: { id: "user-1" },
    account: null,
    profile: undefined,
    email: undefined,
    credentials: undefined
  });

  assert.equal(result, true);
  assert.equal(updateCalls.length, 1);
  assert.equal(updateCalls[0]?.where.id, "user-1");
  assert.equal(updateCalls[0]?.data.lastLoginAt instanceof Date, true);
  assert.deepEqual(bootstrapCalls, ["user-1"]);
});
