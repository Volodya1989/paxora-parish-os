import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "@/tests/_helpers/load-module";

const state = {
  session: {
    user: { id: "user-1", activeParishId: "parish-1", name: "Member", email: "member@example.com" }
  } as any,
  requesterRole: "MEMBER" as "MEMBER" | "ADMIN",
  groupMember: false
};

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => state.session
  }
});

mock.module("next/cache", {
  namedExports: {
    revalidatePath: () => undefined
  }
});

mock.module("@/server/db/prisma", {
  namedExports: {
    prisma: {
      membership: {
        findUnique: async () => ({ role: state.requesterRole }),
        findFirst: async () => ({ userId: "clergy-1" })
      },
      groupMembership: {
        findFirst: async () => (state.groupMember ? { id: "gm-1" } : null)
      },
      user: {
        findUnique: async () => ({ email: "member@example.com", name: "Member" })
      },
      request: {
        create: async () => ({ id: "request-1" })
      }
    }
  }
});

test("submitParishionerContextRequest rejects non-parishioner", async () => {
  state.requesterRole = "ADMIN";

  const actions = await loadModuleFromRoot<any>("server/actions/requests");
  const formData = new FormData();
  formData.set("title", "Create event");
  formData.set("description", "Please create this public event for parishioners.");
  formData.set("requestedEntityType", "EVENT");
  formData.set("scope", "PUBLIC");
  formData.set("sourceScreen", "events");

  const result = await actions.submitParishionerContextRequest(formData);
  assert.equal(result.status, "error");
  assert.match(result.message ?? "", /Only parishioners/i);
});

test("submitParishionerContextRequest rejects group scope when user is not a member", async () => {
  state.requesterRole = "MEMBER";
  state.groupMember = false;

  const actions = await loadModuleFromRoot<any>("server/actions/requests");
  const formData = new FormData();
  formData.set("title", "Create group task");
  formData.set("description", "Please create this serve task for our group members.");
  formData.set("requestedEntityType", "SERVE_TASK");
  formData.set("scope", "GROUP");
  formData.set("sourceScreen", "serve");
  formData.set("groupId", "group-1");

  const result = await actions.submitParishionerContextRequest(formData);
  assert.equal(result.status, "error");
  assert.match(result.message ?? "", /active member/i);
});
