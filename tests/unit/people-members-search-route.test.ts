import { beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { resolveFromRoot } from "../_helpers/resolve";

const state = {
  session: null as { user?: { id?: string; activeParishId?: string | null } } | null,
  allowRole: true,
  lastRequire: null as { userId: string; parishId: string } | null,
  lastSearch: null as { userId: string; parishId: string; query?: string | null } | null
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
    requireAdminOrShepherd: async (userId: string, parishId: string) => {
      state.lastRequire = { userId, parishId };
      if (!state.allowRole) {
        throw new Error("Forbidden");
      }
      return { role: "ADMIN" };
    }
  }
});

mock.module(resolveFromRoot("lib/queries/people"), {
  namedExports: {
    getPeopleListForAdmin: async (userId: string, parishId: string, query?: string | null) => {
      state.lastSearch = { userId, parishId, query };
      return [
        {
          id: "member-1",
          userId: "user-1",
          name: "John",
          email: "john@example.com",
          role: "MEMBER",
          lastLoginAt: null
        }
      ];
    }
  }
});

beforeEach(() => {
  state.session = null;
  state.allowRole = true;
  state.lastRequire = null;
  state.lastSearch = null;
});

test("GET /api/parishes/:parishId/members requires auth", async () => {
  const route = await loadModuleFromRoot<typeof import("@/app/api/parishes/[parishId]/members/route")>(
    "app/api/parishes/[parishId]/members/route"
  );

  const response = await route.GET(new Request("http://localhost/api/parishes/parish-1/members?query=john"), {
    params: Promise.resolve({ parishId: "parish-1" })
  });

  assert.equal(response.status, 401);
  assert.equal(state.lastSearch, null);
});

test("GET /api/parishes/:parishId/members blocks non-active parish access", async () => {
  state.session = { user: { id: "viewer-1", activeParishId: "parish-2" } };

  const route = await loadModuleFromRoot<typeof import("@/app/api/parishes/[parishId]/members/route")>(
    "app/api/parishes/[parishId]/members/route"
  );

  const response = await route.GET(new Request("http://localhost/api/parishes/parish-1/members?query=john"), {
    params: Promise.resolve({ parishId: "parish-1" })
  });

  assert.equal(response.status, 403);
  assert.equal(state.lastRequire, null);
  assert.equal(state.lastSearch, null);
});

test("GET /api/parishes/:parishId/members enforces admin/clergy and parish scope", async () => {
  state.session = { user: { id: "viewer-1", activeParishId: "parish-1" } };

  const route = await loadModuleFromRoot<typeof import("@/app/api/parishes/[parishId]/members/route")>(
    "app/api/parishes/[parishId]/members/route"
  );

  const response = await route.GET(new Request("http://localhost/api/parishes/parish-1/members?query=JoHn"), {
    params: Promise.resolve({ parishId: "parish-1" })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(state.lastRequire, { userId: "viewer-1", parishId: "parish-1" });
  assert.deepEqual(state.lastSearch, { userId: "viewer-1", parishId: "parish-1", query: "JoHn" });
});

test("GET /api/parishes/:parishId/members forbids unauthorized users", async () => {
  state.session = { user: { id: "viewer-1", activeParishId: "parish-1" } };
  state.allowRole = false;

  const route = await loadModuleFromRoot<typeof import("@/app/api/parishes/[parishId]/members/route")>(
    "app/api/parishes/[parishId]/members/route"
  );

  const response = await route.GET(new Request("http://localhost/api/parishes/parish-1/members?query=john"), {
    params: Promise.resolve({ parishId: "parish-1" })
  });

  assert.equal(response.status, 403);
  assert.equal(state.lastSearch, null);
});
