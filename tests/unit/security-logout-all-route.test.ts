import { beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { resolveFromRoot } from "../_helpers/resolve";

const state = {
  session: null as { user?: { id?: string; activeParishId?: string | null } } | null,
  allowRole: true,
  rateAllowed: true,
  retryAfterSeconds: 0,
  updates: [] as unknown[],
  audits: [] as unknown[]
};

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => state.session
  }
});

mock.module(resolveFromRoot("server/auth/options"), {
  namedExports: {
    authOptions: {}
  }
});

mock.module(resolveFromRoot("server/auth/permissions"), {
  namedExports: {
    requireAdminOrShepherd: async () => {
      if (!state.allowRole) {
        throw new Error("Forbidden");
      }
    }
  }
});

mock.module(resolveFromRoot("server/db/prisma"), {
  namedExports: {
    prisma: {
      user: {
        update: async (payload: unknown) => {
          state.updates.push(payload);
          return { id: "user-1" };
        }
      }
    }
  }
});

mock.module(resolveFromRoot("lib/audit/log"), {
  namedExports: {
    auditLog: async (_db: unknown, input: unknown) => {
      state.audits.push(input);
    }
  }
});

mock.module(resolveFromRoot("lib/security/authSessionRateLimit"), {
  namedExports: {
    consumeLogoutAllDevicesRateLimit: () => ({
      allowed: state.rateAllowed,
      retryAfterSeconds: state.retryAfterSeconds,
      remaining: 0
    }),
    resolveRequestClientAddress: () => "203.0.113.10"
  }
});

beforeEach(() => {
  state.session = null;
  state.allowRole = true;
  state.rateAllowed = true;
  state.retryAfterSeconds = 0;
  state.updates = [];
  state.audits = [];
});

test("POST /api/security/logout-all requires authentication", async () => {
  const route = await loadModuleFromRoot<typeof import("@/app/api/security/logout-all/route")>(
    "app/api/security/logout-all/route"
  );

  const response = await route.POST(new Request("http://localhost/api/security/logout-all", { method: "POST" }));

  assert.equal(response.status, 401);
  assert.equal(state.updates.length, 0);
});

test("POST /api/security/logout-all blocks non-admin users", async () => {
  state.session = { user: { id: "user-1", activeParishId: "parish-1" } };
  state.allowRole = false;

  const route = await loadModuleFromRoot<typeof import("@/app/api/security/logout-all/route")>(
    "app/api/security/logout-all/route"
  );

  const response = await route.POST(new Request("http://localhost/api/security/logout-all", { method: "POST" }));

  assert.equal(response.status, 403);
  assert.equal(state.updates.length, 0);
});

test("POST /api/security/logout-all enforces rate limiting", async () => {
  state.session = { user: { id: "user-1", activeParishId: "parish-1" } };
  state.rateAllowed = false;
  state.retryAfterSeconds = 42;

  const route = await loadModuleFromRoot<typeof import("@/app/api/security/logout-all/route")>(
    "app/api/security/logout-all/route"
  );

  const response = await route.POST(new Request("http://localhost/api/security/logout-all", { method: "POST" }));

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "42");
  assert.equal(state.updates.length, 0);
});

test("POST /api/security/logout-all increments auth session version and audits", async () => {
  state.session = { user: { id: "user-1", activeParishId: "parish-1" } };

  const route = await loadModuleFromRoot<typeof import("@/app/api/security/logout-all/route")>(
    "app/api/security/logout-all/route"
  );

  const response = await route.POST(
    new Request("http://localhost/api/security/logout-all", {
      method: "POST",
      headers: {
        "user-agent": "UnitTestAgent/1.0"
      }
    })
  );

  assert.equal(response.status, 200);
  assert.equal(state.updates.length, 1);
  assert.deepEqual(state.updates[0], {
    where: { id: "user-1" },
    data: { authSessionVersion: { increment: 1 } }
  });

  assert.equal(state.audits.length, 1);
  assert.deepEqual(state.audits[0], {
    parishId: "parish-1",
    actorUserId: "user-1",
    action: "SECURITY_LOGOUT_ALL_DEVICES",
    targetType: "USER",
    targetId: "user-1",
    metadata: {
      ip: "203.0.113.10",
      userAgent: "UnitTestAgent/1.0",
      keepCurrentSession: true
    }
  });
});
