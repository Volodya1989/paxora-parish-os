import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { resolveFromRoot } from "../_helpers/resolve";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = test.skip;

const session = {
  user: {
    id: "",
    activeParishId: ""
  }
};

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => session
  }
});

mock.module("next/cache", {
  namedExports: {
    revalidatePath: () => undefined
  }
});

async function resetDatabase() {
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let actions: typeof import("@/app/actions/members");

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  actions = await import(resolveFromRoot("app/actions/members"));
  await prisma.$connect();
  await resetDatabase();
});

after(async () => {
  if (!hasDatabase) {
    return;
  }
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("invite, join requests, approvals, role changes, and leave", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Lydia", slug: "st-lydia" }
  });
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const parishioner = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const coordinator = await prisma.user.create({
    data: {
      email: "coordinator@example.com",
      name: "Coordinator",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const requester = await prisma.user.create({
    data: {
      email: "requester@example.com",
      name: "Requester",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const requesterTwo = await prisma.user.create({
    data: {
      email: "requester2@example.com",
      name: "Requester Two",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const outsider = await prisma.user.create({
    data: {
      email: "outsider@example.com",
      name: "Outsider",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: parishioner.id, role: "MEMBER" },
      { parishId: parish.id, userId: coordinator.id, role: "MEMBER" },
      { parishId: parish.id, userId: requester.id, role: "MEMBER" },
      { parishId: parish.id, userId: requesterTwo.id, role: "MEMBER" },
      { parishId: parish.id, userId: outsider.id, role: "MEMBER" }
    ]
  });

  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      name: "Hospitality",
      description: "Welcome team",
      joinPolicy: "REQUEST_TO_JOIN",
      visibility: "PUBLIC"
    }
  });

  await prisma.groupMembership.create({
    data: {
      groupId: group.id,
      userId: coordinator.id,
      role: "COORDINATOR",
      status: "ACTIVE"
    }
  });

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  const inviteResult = await actions.inviteMember({
    groupId: group.id,
    email: parishioner.email,
    role: "PARISHIONER"
  });

  assert.equal(inviteResult.status, "success");

  const cancelInviteResult = await actions.inviteMember({
    groupId: group.id,
    email: outsider.email,
    role: "PARISHIONER"
  });

  assert.equal(cancelInviteResult.status, "success");

  const cancelResult = await actions.cancelInvite({
    groupId: group.id,
    userId: outsider.id
  });

  assert.equal(cancelResult.status, "success");

  const cancelledMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: outsider.id
      }
    }
  });

  assert.equal(cancelledMembership, null);

  const pendingInvite = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: parishioner.id
      }
    }
  });

  assert.equal(pendingInvite?.status, "INVITED");

  session.user.id = parishioner.id;
  session.user.activeParishId = parish.id;

  const acceptResult = await actions.acceptInvite({ groupId: group.id });
  assert.equal(acceptResult.status, "success");

  const activeMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: parishioner.id
      }
    }
  });

  assert.equal(activeMembership?.status, "ACTIVE");

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  const roleResult = await actions.changeMemberRole({
    groupId: group.id,
    userId: parishioner.id,
    role: "COORDINATOR"
  });

  assert.equal(roleResult.status, "success");

  const updatedMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: parishioner.id
      }
    }
  });

  assert.equal(updatedMembership?.role, "COORDINATOR");

  const removeResult = await actions.removeMember({
    groupId: group.id,
    userId: parishioner.id
  });

  assert.equal(removeResult.status, "success");

  const removedMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: parishioner.id
      }
    }
  });

  assert.equal(removedMembership, null);

  session.user.id = requester.id;
  session.user.activeParishId = parish.id;

  const requestResult = await actions.requestToJoin({ groupId: group.id });
  assert.equal(requestResult.status, "success");

  const pendingRequest = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: requester.id
      }
    }
  });

  assert.equal(pendingRequest?.status, "REQUESTED");

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  const approveResult = await actions.approveJoinRequest({
    groupId: group.id,
    userId: requester.id
  });

  assert.equal(approveResult.status, "success");

  const approvedMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: requester.id
      }
    }
  });

  assert.equal(approvedMembership?.status, "ACTIVE");

  session.user.id = requesterTwo.id;
  session.user.activeParishId = parish.id;

  const secondRequest = await actions.requestToJoin({ groupId: group.id });
  assert.equal(secondRequest.status, "success");

  session.user.id = coordinator.id;
  session.user.activeParishId = parish.id;

  const coordinatorApproval = await actions.approveJoinRequest({
    groupId: group.id,
    userId: requesterTwo.id
  });

  assert.equal(coordinatorApproval.status, "success");

  session.user.id = requesterTwo.id;
  session.user.activeParishId = parish.id;

  const leaveResult = await actions.leaveGroup({ groupId: group.id });
  assert.equal(leaveResult.status, "success");

  const leftMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: requesterTwo.id
      }
    }
  });

  assert.equal(leftMembership, null);

  const openGroup = await prisma.group.create({
    data: {
      parishId: parish.id,
      name: "Open Doors",
      description: "Open join group",
      joinPolicy: "OPEN",
      visibility: "PUBLIC"
    }
  });

  session.user.id = requesterTwo.id;
  session.user.activeParishId = parish.id;

  const joinResult = await actions.joinGroup({ groupId: openGroup.id });
  assert.equal(joinResult.status, "success");

  const openMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: openGroup.id,
        userId: requesterTwo.id
      }
    }
  });

  assert.equal(openMembership?.status, "ACTIVE");

  session.user.id = outsider.id;
  session.user.activeParishId = parish.id;

  const unauthorizedInvite = await actions.inviteMember({
    groupId: group.id,
    email: "newbie@example.com",
    role: "PARISHIONER"
  });

  assert.equal(unauthorizedInvite.status, "error");
  assert.equal(unauthorizedInvite.error, "NOT_AUTHORIZED");
});
