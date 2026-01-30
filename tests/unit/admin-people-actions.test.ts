import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => null
  }
});

mock.module("next/cache", {
  namedExports: {
    revalidatePath: () => undefined
  }
});

test.skip("updateMemberRole returns not authorized without session", async () => {
  const actions = await loadModuleFromRoot<typeof import("@/app/actions/people")>(
    "app/actions/people"
  );
  const result = await actions.updateMemberRole({ memberId: "member", role: "ADMIN" });

  assert.equal(result.status, "error");
  assert.equal(result.error, "NOT_AUTHORIZED");
});

test.skip("removeMember returns not authorized without session", async () => {
  const actions = await loadModuleFromRoot<typeof import("@/app/actions/people")>(
    "app/actions/people"
  );
  const result = await actions.removeMember({ memberId: "member" });

  assert.equal(result.status, "error");
  assert.equal(result.error, "NOT_AUTHORIZED");
});
