import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";

const session = {
  user: {
    id: "",
    activeParishId: ""
  }
} as { user: { id: string; activeParishId: string } } | null;

let allowPlatformDelete = false;

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => session
  }
});

mock.module("@/server/auth/permissions", {
  namedExports: {
    requireAdminOrShepherd: async () => ({ id: "leader-1", role: "ADMIN" }),
    requirePlatformAdmin: async () => {
      if (!allowPlatformDelete) {
        throw new Error("Forbidden");
      }
      return { platformRole: "SUPERADMIN" };
    }
  }
});

test("deleteOwnAccount requires an authenticated session", async () => {
  (session as any).user.id = "";
  (session as any).user.activeParishId = "";

  const actions = await loadModuleFromRoot<typeof import("@/app/actions/account")>("app/actions/account");
  const result = await actions.deleteOwnAccount({ confirmation: "DELETE" });

  assert.equal(result.status, "error");
  assert.equal(result.error, "NOT_AUTHORIZED");
});

test("deleteUser requires platform admin role", async () => {
  (session as any).user.id = "leader-1";
  (session as any).user.activeParishId = "parish-1";
  allowPlatformDelete = false;

  const actions = await loadModuleFromRoot<typeof import("@/app/actions/people")>("app/actions/people");
  const result = await actions.deleteUser({ userId: "target-user" });

  assert.equal(result.status, "error");
  assert.equal(result.error, "PLATFORM_ADMIN_REQUIRED");
});
