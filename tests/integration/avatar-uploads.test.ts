import { after, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { listGroups } from "@/lib/queries/groups";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { applyMigrations } from "../_helpers/migrate";

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

mock.module("../../lib/storage/r2", {
  namedExports: {
    signR2PutUrl: () => "https://r2.test/signed-url"
  }
});

let userAvatarRoute: any;
let groupAvatarRoute: any;

async function resetDatabase() {
  await prisma.chatMessageAttachment.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  if (!hasDatabase) return;
  await applyMigrations();
  await prisma.$connect();
  await resetDatabase();
  userAvatarRoute = await loadModuleFromRoot("app/api/users/[userId]/avatar/route");
  groupAvatarRoute = await loadModuleFromRoot("app/api/groups/[groupId]/avatar/route");
  mock.method(global, "fetch", async () => new Response(null, { status: 200 }));
});

after(async () => {
  if (!hasDatabase) return;
  await resetDatabase();
  await prisma.$disconnect();
  mock.restoreAll();
});

dbTest("uploads a user avatar and saves avatarKey", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Test", slug: "st-test-avatar-user" } });
  const user = await prisma.user.create({ data: { email: "user@avatar.test", passwordHash: "hash", activeParishId: parish.id } });
  await prisma.membership.create({ data: { parishId: parish.id, userId: user.id, role: "MEMBER" } });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const formData = new FormData();
  formData.append("file", new File([new Uint8Array([1, 2, 3])], "avatar.png", { type: "image/png" }));

  const response = await userAvatarRoute.POST(new Request("http://localhost", { method: "POST", body: formData }), {
    params: Promise.resolve({ userId: user.id })
  });

  assert.equal(response.status, 200);
  const updated = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarKey: true } });
  assert.ok(updated?.avatarKey?.startsWith(`users/${user.id}/avatar/`));
});

dbTest("prevents uploading another user's avatar", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Test2", slug: "st-test-avatar-user-2" } });
  const userA = await prisma.user.create({ data: { email: "a@avatar.test", passwordHash: "hash", activeParishId: parish.id } });
  const userB = await prisma.user.create({ data: { email: "b@avatar.test", passwordHash: "hash", activeParishId: parish.id } });
  await prisma.membership.createMany({ data: [
    { parishId: parish.id, userId: userA.id, role: "MEMBER" },
    { parishId: parish.id, userId: userB.id, role: "MEMBER" }
  ] });

  session.user.id = userA.id;
  session.user.activeParishId = parish.id;

  const formData = new FormData();
  formData.append("file", new File([new Uint8Array([1])], "avatar.png", { type: "image/png" }));

  const response = await userAvatarRoute.POST(new Request("http://localhost", { method: "POST", body: formData }), {
    params: Promise.resolve({ userId: userB.id })
  });

  assert.equal(response.status, 403);
});

dbTest("uploads group avatar for coordinator and exposes it in group list with last message metadata", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Group", slug: "st-test-avatar-group" } });
  const coordinator = await prisma.user.create({ data: { email: "coord@avatar.test", name: "Coordinator", passwordHash: "hash", activeParishId: parish.id } });
  await prisma.membership.create({ data: { parishId: parish.id, userId: coordinator.id, role: "MEMBER" } });

  const group = await prisma.group.create({
    data: { parishId: parish.id, createdById: coordinator.id, name: "Care Team", joinPolicy: "OPEN", visibility: "PUBLIC", status: "ACTIVE" }
  });
  await prisma.groupMembership.create({ data: { groupId: group.id, userId: coordinator.id, role: "COORDINATOR", status: "ACTIVE" } });
  const channel = await prisma.chatChannel.create({ data: { parishId: parish.id, groupId: group.id, type: "GROUP", name: "Care Team" } });
  await prisma.chatMessage.create({ data: { channelId: channel.id, authorId: coordinator.id, body: "Welcome everyone" } });

  session.user.id = coordinator.id;
  session.user.activeParishId = parish.id;

  const formData = new FormData();
  formData.append("file", new File([new Uint8Array([1, 2])], "group.webp", { type: "image/webp" }));

  const response = await groupAvatarRoute.POST(new Request("http://localhost", { method: "POST", body: formData }), {
    params: Promise.resolve({ groupId: group.id })
  });

  assert.equal(response.status, 200);

  const groups = await listGroups(parish.id, coordinator.id, "MEMBER", true);
  assert.equal(groups[0]?.name, "Care Team");
  assert.ok(groups[0]?.avatarUrl?.includes(`/api/images/groups/${group.id}/avatar/`));
  assert.equal(groups[0]?.lastMessageAuthor, "Coordinator");
  assert.equal(groups[0]?.lastMessage, "Welcome everyone");
});

dbTest("denies group avatar upload for non-coordinator member", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Group2", slug: "st-test-avatar-group-2" } });
  const owner = await prisma.user.create({ data: { email: "owner@avatar.test", passwordHash: "hash", activeParishId: parish.id } });
  const member = await prisma.user.create({ data: { email: "member@avatar.test", passwordHash: "hash", activeParishId: parish.id } });

  await prisma.membership.createMany({ data: [
    { parishId: parish.id, userId: owner.id, role: "MEMBER" },
    { parishId: parish.id, userId: member.id, role: "MEMBER" }
  ] });

  const group = await prisma.group.create({
    data: { parishId: parish.id, createdById: owner.id, name: "Readers", joinPolicy: "OPEN", visibility: "PUBLIC", status: "ACTIVE" }
  });

  await prisma.groupMembership.createMany({ data: [
    { groupId: group.id, userId: owner.id, role: "COORDINATOR", status: "ACTIVE" },
    { groupId: group.id, userId: member.id, role: "PARISHIONER", status: "ACTIVE" }
  ] });

  session.user.id = member.id;
  session.user.activeParishId = parish.id;

  const formData = new FormData();
  formData.append("file", new File([new Uint8Array([9])], "group.png", { type: "image/png" }));

  const response = await groupAvatarRoute.POST(new Request("http://localhost", { method: "POST", body: formData }), {
    params: Promise.resolve({ groupId: group.id })
  });

  assert.equal(response.status, 403);
});
