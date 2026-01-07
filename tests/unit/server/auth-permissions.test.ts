import { test } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { loadModuleFromRoot } from "../../_helpers/load-module";
import { resolveFromRoot } from "../../_helpers/resolve";

const mockModule = (mock as any).module.bind(mock) as (
  specifier: string,
  options: { namedExports?: Record<string, unknown> }
) => void;
let membership: { role: "ADMIN" | "SHEPHERD" | "MEMBER" } | null = { role: "ADMIN" };

mockModule(resolveFromRoot("server/db/groups"), {
  namedExports: {
    getParishMembership: async () => membership
  }
});

test("requireAdminOrShepherd allows admin and shepherd roles", async () => {
  const { requireAdminOrShepherd } = await loadModuleFromRoot<
    typeof import("@/server/auth/permissions")
  >("server/auth/permissions");
  membership = { role: "ADMIN" };
  await requireAdminOrShepherd("user-1", "parish-1");

  membership = { role: "SHEPHERD" };
  await requireAdminOrShepherd("user-1", "parish-1");
});

test("requireAdminOrShepherd rejects members and missing memberships", async () => {
  const { requireAdminOrShepherd } = await loadModuleFromRoot<
    typeof import("@/server/auth/permissions")
  >("server/auth/permissions");
  membership = { role: "MEMBER" };
  await assert.rejects(
    () => requireAdminOrShepherd("user-1", "parish-1"),
    /Forbidden/
  );

  membership = null;
  await assert.rejects(
    () => requireAdminOrShepherd("user-1", "parish-1"),
    /Unauthorized/
  );
});
