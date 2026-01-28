import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { listMessages } from "@/lib/queries/chat";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test.skip : test.skip;

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

async function resetDatabase() {
  await prisma.chatPinnedMessage.deleteMany();
  await prisma.chatChannelMembership.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannel.deleteMany();
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

let actions: typeof import("@/server/actions/chat");

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  const loaded = (await loadModuleFromRoot(
    "server/actions/chat"
  )) as typeof import("@/server/actions/chat");
  const fallback = (loaded as { default?: typeof loaded }).default ?? loaded;
  actions =
    typeof (loaded as typeof fallback).postMessage === "function" ? loaded : fallback;
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

dbTest("post, delete, pin/unpin, lock/unlock chat messages", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Luke", slug: "st-luke" }
  });
  const admin = await prisma.user.create({
    data: {
      email: "admin@chat.test",
      name: "Admin",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: admin.id,
      role: "ADMIN"
    }
  });

  const channel = await prisma.chatChannel.create({
    data: {
      parishId: parish.id,
      type: "PARISH",
      name: "General"
    }
  });

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  const firstNow = new Date("2024-04-01T08:00:00.000Z");
  const secondNow = new Date("2024-04-01T09:00:00.000Z");

  const firstMessage = await actions.postMessage(channel.id, "Hello parish", () => firstNow);
  await actions.postMessage(channel.id, "Second note", () => secondNow);

  const messages = await listMessages({ channelId: channel.id });
  assert.equal(messages.length, 2);
  assert.equal(messages[0]?.id, firstMessage.id);

  await actions.deleteMessage(firstMessage.id, () => new Date("2024-04-01T10:00:00.000Z"));
  const deleted = await prisma.chatMessage.findUnique({ where: { id: firstMessage.id } });
  assert.ok(deleted?.deletedAt);

  await actions.pinMessage(firstMessage.id, () => new Date("2024-04-01T11:00:00.000Z"));
  const pinned = await prisma.chatPinnedMessage.findUnique({
    where: { channelId: channel.id }
  });
  assert.equal(pinned?.messageId, firstMessage.id);

  await actions.unpinMessage(channel.id);
  const afterUnpin = await prisma.chatPinnedMessage.findUnique({
    where: { channelId: channel.id }
  });
  assert.equal(afterUnpin, null);

  await actions.lockChannel(channel.id, () => new Date("2024-04-01T12:00:00.000Z"));
  const locked = await prisma.chatChannel.findUnique({ where: { id: channel.id } });
  assert.ok(locked?.lockedAt);

  await actions.unlockChannel(channel.id);
  const unlocked = await prisma.chatChannel.findUnique({ where: { id: channel.id } });
  assert.equal(unlocked?.lockedAt, null);
});
