import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { applyMigrations } from "../_helpers/migrate";
import { listGroups as listVisibleGroups } from "@/lib/queries/groups";
import { listTaskFilterGroups } from "@/server/db/groups";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

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
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.digest.deleteMany();
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let actions: any;

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  actions = await loadModuleFromRoot("server/actions/groups");
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

dbTest("create group succeeds with valid input", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Agnes", slug: "st-agnes" }
  });
  const user = await prisma.user.create({
    data: {
      email: "leader@example.com",
      name: "Leader",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: user.id,
      role: "ADMIN"
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const createdGroup = await actions.createGroup({
    parishId: parish.id,
    actorUserId: user.id,
    name: "Greeters",
    description: "Front door welcome team",
    visibility: "PUBLIC",
    joinPolicy: "OPEN"
  });

  const stored = (await prisma.group.findFirst({
    where: { parishId: parish.id, name: "Greeters" }
  })) as { archivedAt: Date | null; visibility: string; joinPolicy: string } | null;

  assert.ok(stored);
  assert.equal(stored?.archivedAt, null);
  assert.equal(stored?.visibility, "PUBLIC");
  assert.equal(stored?.joinPolicy, "OPEN");

  const creatorMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: createdGroup.id,
        userId: user.id
      }
    }
  });

  assert.equal(creatorMembership?.role, "COORDINATOR");
  assert.equal(creatorMembership?.status, "ACTIVE");
});


dbTest("create group provisions a group chat channel", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Martha", slug: "st-martha" }
  });
  const user = await prisma.user.create({
    data: {
      email: "leader-chat@example.com",
      name: "Leader Chat",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: user.id,
      role: "ADMIN"
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const createdGroup = await actions.createGroup({
    parishId: parish.id,
    actorUserId: user.id,
    name: "Hospitality",
    visibility: "PUBLIC",
    joinPolicy: "OPEN"
  });

  const chatChannels = await prisma.chatChannel.findMany({
    where: {
      parishId: parish.id,
      groupId: createdGroup.id,
      type: "GROUP"
    }
  });

  assert.equal(chatChannels.length, 1);
  assert.equal(chatChannels[0]?.name, "Hospitality");
});


dbTest("approving pending group request provisions chat channel", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Lucy", slug: "st-lucy" }
  });
  const requester = await prisma.user.create({
    data: {
      email: "requester@example.com",
      name: "Requester",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const admin = await prisma.user.create({
    data: {
      email: "approver@example.com",
      name: "Approver",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: requester.id, role: "MEMBER" },
      { parishId: parish.id, userId: admin.id, role: "ADMIN" }
    ]
  });

  session.user.id = requester.id;
  session.user.activeParishId = parish.id;

  const submitResult = await actions.submitGroupCreationRequest({
    parishId: parish.id,
    actorUserId: requester.id,
    name: "Youth Team",
    visibility: "PUBLIC",
    joinPolicy: "REQUEST_TO_JOIN"
  });

  assert.equal(submitResult.status, "success");
  assert.ok(submitResult.groupId);

  const beforeApprovalChannels = await prisma.chatChannel.count({
    where: {
      parishId: parish.id,
      groupId: submitResult.groupId,
      type: "GROUP"
    }
  });
  assert.equal(beforeApprovalChannels, 0);

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  await actions.approveGroupRequest({
    parishId: parish.id,
    actorUserId: admin.id,
    groupId: submitResult.groupId
  });

  const afterApprovalChannels = await prisma.chatChannel.findMany({
    where: {
      parishId: parish.id,
      groupId: submitResult.groupId,
      type: "GROUP"
    }
  });

  assert.equal(afterApprovalChannels.length, 1);
  assert.equal(afterApprovalChannels[0]?.name, "Youth Team");
});

dbTest("archive, restore, and undo", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Jude", slug: "st-jude" }
  });
  const user = await prisma.user.create({
    data: {
      email: "shepherd@example.com",
      name: "Shepherd",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: user.id,
      role: "SHEPHERD"
    }
  });
  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      createdById: user.id,
      name: "Outreach",
      description: "Community service",
      status: "ACTIVE"
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  await actions.archiveGroup({
    parishId: parish.id,
    actorUserId: user.id,
    groupId: group.id
  });

  const archived = (await prisma.group.findUnique({ where: { id: group.id } })) as {
    archivedAt: Date | null;
  } | null;
  assert.ok(archived?.archivedAt);

  await actions.restoreGroup({
    parishId: parish.id,
    actorUserId: user.id,
    groupId: group.id
  });

  const restored = (await prisma.group.findUnique({ where: { id: group.id } })) as {
    archivedAt: Date | null;
  } | null;
  assert.equal(restored?.archivedAt, null);
});

dbTest("edit group updates fields", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Joseph", slug: "st-joseph" }
  });
  const user = await prisma.user.create({
    data: {
      email: "editor@example.com",
      name: "Editor",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: user.id,
      role: "ADMIN"
    }
  });
  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      createdById: user.id,
      name: "Lectors",
      description: "Readers",
      visibility: "PUBLIC",
      joinPolicy: "INVITE_ONLY",
      status: "ACTIVE"
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  await actions.updateGroup({
    parishId: parish.id,
    actorUserId: user.id,
    groupId: group.id,
    name: "Lectors & Readers",
    description: "Updated description",
    visibility: "PRIVATE",
    joinPolicy: "REQUEST_TO_JOIN"
  });

  const updated = await prisma.group.findUnique({
    where: { id: group.id },
    select: { name: true, description: true, visibility: true, joinPolicy: true }
  });

  assert.equal(updated?.name, "Lectors & Readers");
  assert.equal(updated?.description, "Updated description");
  assert.equal(updated?.visibility, "PRIVATE");
  assert.equal(updated?.joinPolicy, "REQUEST_TO_JOIN");
});


dbTest("create hidden group with invite only exposes invited user", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Michael", slug: "st-michael" } });
  const [leader, invitedUser, otherUser] = await Promise.all([
    prisma.user.create({ data: { email: "leader2@example.com", name: "Leader", passwordHash: "hashed", activeParishId: parish.id } }),
    prisma.user.create({ data: { email: "invited@example.com", name: "Invited", passwordHash: "hashed", activeParishId: parish.id } }),
    prisma.user.create({ data: { email: "other@example.com", name: "Other", passwordHash: "hashed", activeParishId: parish.id } })
  ]);

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: leader.id, role: "ADMIN" },
      { parishId: parish.id, userId: invitedUser.id, role: "MEMBER" },
      { parishId: parish.id, userId: otherUser.id, role: "MEMBER" }
    ]
  });

  session.user.id = leader.id;
  session.user.activeParishId = parish.id;

  await actions.createGroup({
    parishId: parish.id,
    actorUserId: leader.id,
    name: "Hidden Council",
    visibility: "PRIVATE",
    joinPolicy: "INVITE_ONLY",
    inviteeUserIds: [invitedUser.id]
  });

  const invitedList = await listVisibleGroups(parish.id, invitedUser.id, "MEMBER", true);
  const invitedRecord = invitedList.find((group) => group.name === "Hidden Council");
  assert.equal(invitedRecord?.viewerMembershipStatus, "ACTIVE");

  const otherList = await listVisibleGroups(parish.id, otherUser.id, "MEMBER", true);
  assert.equal(otherList.some((group) => group.name === "Hidden Council"), false);
});

dbTest("create visible group with add members keeps group discoverable", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Mark", slug: "st-mark" } });
  const [leader, invitedUser, otherUser] = await Promise.all([
    prisma.user.create({ data: { email: "leader3@example.com", name: "Leader", passwordHash: "hashed", activeParishId: parish.id } }),
    prisma.user.create({ data: { email: "invited2@example.com", name: "Invited", passwordHash: "hashed", activeParishId: parish.id } }),
    prisma.user.create({ data: { email: "other2@example.com", name: "Other", passwordHash: "hashed", activeParishId: parish.id } })
  ]);

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: leader.id, role: "ADMIN" },
      { parishId: parish.id, userId: invitedUser.id, role: "MEMBER" },
      { parishId: parish.id, userId: otherUser.id, role: "MEMBER" }
    ]
  });

  session.user.id = leader.id;
  session.user.activeParishId = parish.id;

  await actions.createGroup({
    parishId: parish.id,
    actorUserId: leader.id,
    name: "Visible Choir",
    visibility: "PUBLIC",
    joinPolicy: "INVITE_ONLY",
    inviteeUserIds: [invitedUser.id]
  });

  const invitedList = await listVisibleGroups(parish.id, invitedUser.id, "MEMBER", true);
  const invitedRecord = invitedList.find((group) => group.name === "Visible Choir");
  assert.equal(invitedRecord?.viewerMembershipStatus, "ACTIVE");

  const otherList = await listVisibleGroups(parish.id, otherUser.id, "MEMBER", true);
  const otherRecord = otherList.find((group) => group.name === "Visible Choir");
  assert.ok(otherRecord);
  assert.equal(otherRecord?.viewerMembershipStatus, null);
});

dbTest("task filter groups include only groups visible to current member context", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Luke", slug: "st-luke" } });
  const [leader, invitedUser, otherUser] = await Promise.all([
    prisma.user.create({ data: { email: "leader4@example.com", name: "Leader", passwordHash: "hashed", activeParishId: parish.id } }),
    prisma.user.create({ data: { email: "invited3@example.com", name: "Invited", passwordHash: "hashed", activeParishId: parish.id } }),
    prisma.user.create({ data: { email: "other3@example.com", name: "Other", passwordHash: "hashed", activeParishId: parish.id } })
  ]);

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: leader.id, role: "ADMIN" },
      { parishId: parish.id, userId: invitedUser.id, role: "MEMBER" },
      { parishId: parish.id, userId: otherUser.id, role: "MEMBER" }
    ]
  });

  session.user.id = leader.id;
  session.user.activeParishId = parish.id;

  const hiddenGroup = await actions.createGroup({
    parishId: parish.id,
    actorUserId: leader.id,
    name: "Hidden Team",
    visibility: "PRIVATE",
    joinPolicy: "INVITE_ONLY",
    inviteeUserIds: [invitedUser.id]
  });

  const invitedGroupFilters = await listTaskFilterGroups({ parishId: parish.id, userId: invitedUser.id, role: "MEMBER" });
  assert.equal(invitedGroupFilters.some((group) => group.name === "Hidden Team"), true);

  const otherGroupFilters = await listTaskFilterGroups({ parishId: parish.id, userId: otherUser.id, role: "MEMBER" });
  assert.equal(otherGroupFilters.some((group) => group.name === "Hidden Team"), false);
});
