import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { resolveFromRoot } from "../_helpers/resolve";

afterEach(() => {
  mock.restoreAll();
});

test("getParishMembership returns virtual ADMIN membership for impersonating super admin", async () => {
  mock.module(resolveFromRoot("server/db/prisma"), {
    namedExports: {
      prisma: {
        membership: {
          findUnique: async () => null
        },
        user: {
          findUnique: async () => ({
            platformRole: "SUPERADMIN",
            impersonatedParishId: "parish-1"
          })
        }
      }
    }
  });

  const { getParishMembership } = await loadModuleFromRoot<typeof import("@/server/db/groups")>(
    "server/db/groups"
  );

  const membership = await getParishMembership("parish-1", "user-1");

  assert.deepEqual(membership, {
    id: "virtual-impersonation:parish-1:user-1",
    role: "ADMIN"
  });
});

test("requireAdminOrShepherd authorizes impersonating super admin through effective membership", async () => {
  mock.module(resolveFromRoot("server/db/groups"), {
    namedExports: {
      getParishMembership: async () => ({
        id: "virtual-impersonation:parish-2:user-2",
        role: "ADMIN"
      })
    }
  });

  const { requireAdminOrShepherd } = await loadModuleFromRoot<
    typeof import("@/server/auth/permissions")
  >("server/auth/permissions");

  const membership = await requireAdminOrShepherd("user-2", "parish-2");

  assert.equal(membership.role, "ADMIN");
});
