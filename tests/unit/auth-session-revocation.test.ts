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
    authSessionKeepJti: "keep-jti-abc",
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
    token: { sub: "user-1", authSessionVersion: 0, jti: "other-jti" },
    trigger: undefined
  } as any);

  assert.equal(token.isSessionRevoked, true);
});

test("jwt callback keeps session alive when JTI matches authSessionKeepJti", async () => {
  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );

  const jwt = authOptions.callbacks?.jwt;
  assert.ok(jwt);

  const token = await jwt!({
    token: { sub: "user-1", authSessionVersion: 0, jti: "keep-jti-abc" },
    trigger: undefined
  } as any);

  assert.equal(token.isSessionRevoked, false);
  assert.equal(token.authSessionVersion, 1);
});

test("jwt callback does NOT un-revoke a stale session via trigger=update when JTI does not match", async () => {
  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );

  const jwt = authOptions.callbacks?.jwt;
  assert.ok(jwt);

  const token = await jwt!({
    token: { sub: "user-1", authSessionVersion: 0, jti: "different-jti" },
    trigger: "update"
  } as any);

  // Even though trigger is "update", the JTI does not match — must stay revoked
  assert.equal(token.isSessionRevoked, true);
});

test("jwt callback keeps initiating session alive via trigger=update when JTI matches", async () => {
  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );

  const jwt = authOptions.callbacks?.jwt;
  const session = authOptions.callbacks?.session;
  assert.ok(jwt);
  assert.ok(session);

  const refreshedToken = await jwt!({
    token: { sub: "user-1", authSessionVersion: 0, jti: "keep-jti-abc" },
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

test("session callback blanks user data when session is revoked", async () => {
  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );

  const session = authOptions.callbacks?.session;
  assert.ok(session);

  const result = await session!({
    session: { user: { id: "user-1", activeParishId: "parish-1" } },
    token: { sub: "user-1", isSessionRevoked: true }
  } as any);

  assert.equal((result as any).user.id, "");
  assert.equal((result as any).user.activeParishId, null);
});

test("session callback blanks user data when user is deleted", async () => {
  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );

  const session = authOptions.callbacks?.session;
  assert.ok(session);

  const result = await session!({
    session: { user: { id: "user-1", activeParishId: "parish-1" } },
    token: { sub: "user-1", isDeleted: true }
  } as any);

  assert.equal((result as any).user.id, "");
  assert.equal((result as any).user.activeParishId, null);
});

test("jwt callback skips DB lookup when TTL has not expired and session is valid", async () => {
  const { authOptions } = await loadModuleFromRoot<typeof import("@/server/auth/options")>(
    "server/auth/options"
  );

  const jwt = authOptions.callbacks?.jwt;
  assert.ok(jwt);

  // First call — sets lastVersionCheckAt and queries DB
  const firstToken = await jwt!({
    token: { sub: "user-1", authSessionVersion: 1, jti: "keep-jti-abc" },
    trigger: undefined
  } as any);

  assert.equal(firstToken.isSessionRevoked, false);
  assert.equal(typeof firstToken.lastVersionCheckAt, "number");

  // Second call with the same token — TTL not expired, should skip DB
  // (the token already has version 1 matching DB, and lastVersionCheckAt is fresh)
  const secondToken = await jwt!({
    token: firstToken,
    trigger: undefined
  } as any);

  assert.equal(secondToken.isSessionRevoked, false);
  // lastVersionCheckAt should be unchanged since DB was not re-queried
  assert.equal(secondToken.lastVersionCheckAt, firstToken.lastVersionCheckAt);
});
