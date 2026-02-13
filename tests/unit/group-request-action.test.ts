import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "@/tests/_helpers/load-module";

let txError: Error | null = null;
let shouldNotify = false;
let notifyInAppCalls = 0;
let notifyPushCalls = 0;

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => ({ user: { id: "u1", activeParishId: "p1" } })
  }
});

mock.module("next/cache", {
  namedExports: {
    revalidatePath: () => undefined
  }
});

mock.module("@/server/db/groups", {
  namedExports: {
    getParishMembership: async () => ({ role: "MEMBER" })
  }
});

mock.module("@/lib/permissions", {
  namedExports: {
    isParishLeader: () => false
  }
});

mock.module("@/lib/notifications/notify", {
  namedExports: {
    notifyCreationRequestInApp: async () => {
      notifyInAppCalls += 1;
    }
  }
});

mock.module("@/lib/push/notify", {
  namedExports: {
    notifyCreationRequest: async () => {
      notifyPushCalls += 1;
    }
  }
});

mock.module("@/server/db/prisma", {
  namedExports: {
    prisma: {
      $transaction: async (cb: any) => {
        if (txError) throw txError;
        return cb({
          group: {
            count: async () => 0,
            findFirst: async () => null,
            create: async () => ({
              id: "g1",
              name: "Test Group",
              description: null,
              visibility: "PUBLIC",
              joinPolicy: "OPEN",
              createdAt: new Date(),
              archivedAt: null,
              status: "PENDING_APPROVAL"
            })
          }
        });
      },
      membership: {
        findMany: async () => (shouldNotify ? [{ userId: "leader-1" }] : [])
      }
    }
  }
});

test("submitGroupRequest returns structured friendly error for duplicate pending request", async () => {
  txError = new Error("You already have a pending group request with this name.");
  const groups = await loadModuleFromRoot<any>("server/actions/groups");

  const result = await groups.submitGroupRequest({
    parishId: "p1",
    actorUserId: "u1",
    name: "Test Group",
    visibility: "PUBLIC",
    joinPolicy: "OPEN"
  });

  assert.equal(result.status, "error");
  assert.match(result.message ?? "", /already have a pending group request/i);
});

test("createGroup notifies admin/clergy for pending group requests", async () => {
  txError = null;
  shouldNotify = true;
  notifyInAppCalls = 0;
  notifyPushCalls = 0;

  const groups = await loadModuleFromRoot<any>("server/actions/groups");

  await groups.createGroup({
    parishId: "p1",
    actorUserId: "u1",
    name: "Test Group",
    visibility: "PUBLIC",
    joinPolicy: "OPEN"
  });

  assert.equal(notifyInAppCalls, 1);
  assert.equal(notifyPushCalls, 1);
});
