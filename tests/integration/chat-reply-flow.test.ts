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
  actions = typeof (loaded as typeof fallback).postMessage === "function" ? loaded : fallback;
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

dbTest("posts reply with parent preview in listMessages", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. John", slug: "st-john" }
  });
  const admin = await prisma.user.create({
    data: {
      email: "admin@reply.test",
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

  const parentNow = new Date("2024-04-01T08:00:00.000Z");
  const replyNow = new Date("2024-04-01T08:05:00.000Z");

  const parentMessage = await actions.postMessage(channel.id, "Need volunteers", () => parentNow);
  const replyMessage = await actions.postMessage(
    channel.id,
    "I can help",
    parentMessage.id,
    () => replyNow
  );

  const messages = await listMessages({ channelId: channel.id });
  const reply = messages.find((message) => message.id === replyMessage.id);

  assert.ok(reply?.parentMessage);
  assert.equal(reply?.parentMessage?.id, parentMessage.id);
  assert.equal(reply?.parentMessage?.author.name, parentMessage.author.name);
});
