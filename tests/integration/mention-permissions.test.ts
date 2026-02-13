import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { listMentionableUsersForChannel } from "@/lib/mentions/permissions";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

async function resetDatabase() {
  await prisma.notification.deleteMany();
  await prisma.mention.deleteMany();
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
});

after(async () => {
  if (!hasDatabase) return;
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("group channel mention search scopes to group members", async () => {
  const parish = await prisma.parish.create({ data: { name: "St Group", slug: "st-group" } });
  const actor = await prisma.user.create({ data: { email: "actor@g.test", passwordHash: "x", activeParishId: parish.id, name: "Actor" } });
  const inGroup = await prisma.user.create({ data: { email: "ingroup@g.test", passwordHash: "x", activeParishId: parish.id, name: "Inside" } });
  const outside = await prisma.user.create({ data: { email: "outside@g.test", passwordHash: "x", activeParishId: parish.id, name: "Outside" } });

  await prisma.membership.createMany({ data: [
    { parishId: parish.id, userId: actor.id, role: "MEMBER" },
    { parishId: parish.id, userId: inGroup.id, role: "MEMBER" },
    { parishId: parish.id, userId: outside.id, role: "MEMBER" }
  ]});

  const group = await prisma.group.create({ data: { parishId: parish.id, name: "Choir", createdById: actor.id } });
  await prisma.groupMembership.createMany({ data: [
    { groupId: group.id, userId: actor.id, status: "ACTIVE", role: "PARISHIONER" },
    { groupId: group.id, userId: inGroup.id, status: "ACTIVE", role: "PARISHIONER" }
  ]});

  const channel = await prisma.chatChannel.create({ data: { parishId: parish.id, groupId: group.id, type: "GROUP", name: "Choir chat" } });

  const users = await listMentionableUsersForChannel({ parishId: parish.id, actorUserId: actor.id, channelId: channel.id, query: "" });
  const ids = users.map((u) => u.id);
  assert.ok(ids.includes(inGroup.id));
  assert.ok(!ids.includes(outside.id));
});
