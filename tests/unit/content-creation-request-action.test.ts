import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "@/tests/_helpers/load-module";

let membershipRole: "MEMBER" | "ADMIN" = "MEMBER";
let hasGroupMembership = true;
const created: any[] = [];

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => ({
      user: {
        id: "user-1",
        activeParishId: "parish-1",
        name: "User One",
        email: "user1@example.com"
      }
    })
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
        findUnique: async ({ where }: any) => {
          if (where?.parishId_userId?.userId === "user-1") {
            return { role: membershipRole };
          }
          return { role: "ADMIN" };
        }
      },
      groupMembership: {
        findFirst: async () => (hasGroupMembership ? { id: "gm-1" } : null)
      },
      user: {
        findUnique: async () => ({ email: "user1@example.com", name: "User One" })
      },
      request: {
        create: async (args: any) => {
          created.push(args);
          return { id: "req-1" };
        }
      }
    }
  }
});

test("submitContentCreationRequest rejects non-parishioner callers", async () => {
  membershipRole = "ADMIN";
  hasGroupMembership = true;
  created.length = 0;
  const requests = await loadModuleFromRoot<any>("server/actions/requests");

  const fd = new FormData();
  fd.set("requestedEntityType", "GROUP");
  fd.set("scope", "PUBLIC");
  fd.set("title", "Create a group");
  fd.set("description", "Please create this group for outreach ministry.");

  const result = await requests.submitContentCreationRequest(fd);
  assert.equal(result.status, "error");
  assert.match(result.message ?? "", /Only parishioners/i);
  assert.equal(created.length, 0);
});

test("submitContentCreationRequest rejects non-member group scope", async () => {
  membershipRole = "MEMBER";
  hasGroupMembership = false;
  created.length = 0;
  const requests = await loadModuleFromRoot<any>("server/actions/requests");

  const fd = new FormData();
  fd.set("requestedEntityType", "EVENT");
  fd.set("scope", "GROUP");
  fd.set("groupId", "group-x");
  fd.set("title", "Create event");
  fd.set("description", "Please create this event for our group and parish outreach.");

  const result = await requests.submitContentCreationRequest(fd);
  assert.equal(result.status, "error");
  assert.match(result.message ?? "", /only request for groups you belong to/i);
  assert.equal(created.length, 0);
});
