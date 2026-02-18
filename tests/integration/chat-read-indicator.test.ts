import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getChannelReadIndicatorSnapshot, listUnreadCountsForRooms } from "@/lib/queries/chat";
import { getMessageReadProgress } from "@/lib/chat/read-indicator";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

async function resetDatabase() {
  await prisma.chatRoomReadState.deleteMany();
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
});

after(async () => {
  if (!hasDatabase) return;
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("group read indicator transitions from yellow to green as recipients read", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Read", slug: "st-read" }
  });

  const [sender, readerA, readerB] = await Promise.all([
    prisma.user.create({
      data: {
        email: "sender@chat.test",
        name: "Sender",
        passwordHash: "hashed",
        activeParishId: parish.id
      }
    }),
    prisma.user.create({
      data: {
        email: "reader-a@chat.test",
        name: "Reader A",
        passwordHash: "hashed",
        activeParishId: parish.id
      }
    }),
    prisma.user.create({
      data: {
        email: "reader-b@chat.test",
        name: "Reader B",
        passwordHash: "hashed",
        activeParishId: parish.id
      }
    })
  ]);

  await prisma.membership.createMany({
    data: [sender, readerA, readerB].map((user) => ({
      parishId: parish.id,
      userId: user.id,
      role: "MEMBER" as const
    }))
  });

  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      name: "Choir"
    }
  });

  await prisma.groupMembership.createMany({
    data: [sender, readerA, readerB].map((user) => ({
      groupId: group.id,
      userId: user.id,
      status: "ACTIVE" as const,
      role: "PARISHIONER" as const
    }))
  });

  const channel = await prisma.chatChannel.create({
    data: {
      parishId: parish.id,
      groupId: group.id,
      type: "GROUP",
      name: "Choir chat"
    }
  });

  const message = await prisma.chatMessage.create({
    data: {
      channelId: channel.id,
      authorId: sender.id,
      body: "Please review tonight's plan.",
      createdAt: new Date("2025-01-10T10:00:00.000Z")
    }
  });

  await prisma.chatRoomReadState.create({
    data: {
      roomId: channel.id,
      userId: readerA.id,
      lastReadAt: new Date("2025-01-10T10:02:00.000Z")
    }
  });

  const snapshotSomeRead = await getChannelReadIndicatorSnapshot(
    parish.id,
    channel.id,
    sender.id
  );
  assert.ok(snapshotSomeRead);

  const someRead = getMessageReadProgress(
    message.createdAt,
    snapshotSomeRead.sortedRecipientReadAtMs,
    snapshotSomeRead.recipientCount
  );
  assert.equal(someRead.state, "some_read");


  const unreadBefore = await listUnreadCountsForRooms([channel.id], readerB.id);
  assert.equal(unreadBefore.get(channel.id) ?? 0, 1);

  await prisma.chatRoomReadState.create({
    data: {
      roomId: channel.id,
      userId: readerB.id,
      lastReadAt: new Date("2025-01-10T10:03:00.000Z")
    }
  });

  const snapshotAllRead = await getChannelReadIndicatorSnapshot(
    parish.id,
    channel.id,
    sender.id
  );
  assert.ok(snapshotAllRead);

  const allRead = getMessageReadProgress(
    message.createdAt,
    snapshotAllRead.sortedRecipientReadAtMs,
    snapshotAllRead.recipientCount
  );
  assert.equal(allRead.state, "all_read");

  const unreadAfter = await listUnreadCountsForRooms([channel.id], readerB.id);
  assert.equal(unreadAfter.get(channel.id) ?? 0, 0);
});
