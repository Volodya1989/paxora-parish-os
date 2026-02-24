import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { resolveFromRoot } from "../_helpers/resolve";

const state = {
  dbUser: {
    activeParishId: "parish-1",
    platformRole: null,
    impersonatedParishId: null,
    authSessionVersion: 1,
    deletedAt: null
  }
};

mock.module(resolveFromRoot("server/db/prisma"), {
  namedExports: {
    prisma: {
      user: {
        findUnique: async () => state.dbUser,
        update: async () => null
      }
    }
  }
});

mock.module("bcryptjs", {
  defaultExport: {
    compare: async () => true
  },
  namedExports: {
    compare: async () => true
  }
});

mock.module(resolveFromRoot("server/auth/bootstrap"), {
  namedExports: {
    ensureParishBootstrap: async () => undefined
  }
});

test("jwt callback marks stale tokens as revoked when authSessionVersion increased", async () => {
  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );

  const jwt = authOptions.callbacks?.jwt;
  assert.ok(jwt);

  const token = await jwt!({
    token: { sub: "user-1", authSessionVersion: 0 },
    trigger: "signIn"
  } as any);

  assert.equal(token.isSessionRevoked, true);
});

test("jwt callback refresh keeps current session valid after logout-all", async () => {
  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );

  const jwt = authOptions.callbacks?.jwt;
  const session = authOptions.callbacks?.session;
  assert.ok(jwt);
  assert.ok(session);

  const refreshedToken = await jwt!({
    token: { sub: "user-1", authSessionVersion: 0 },
    trigger: "update"
  } as any);

  assert.equal(refreshedToken.isSessionRevoked, false);
  assert.equal(refreshedToken.authSessionVersion, 1);

  const hydratedSession = await session!({
    session: { user: { id: "", activeParishId: null } },
    token: refreshedToken
  } as any);

  assert.equal((hydratedSession as any).user.id, "user-1");
});
