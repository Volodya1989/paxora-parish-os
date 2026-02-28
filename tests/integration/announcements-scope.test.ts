import { after, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { listAnnouncements, getAnnouncement } from "@/lib/queries/announcements";
import { resolveAnnouncementAudience } from "@/lib/notifications/audience";
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

mock.module("next/cache", {
  namedExports: {
    revalidatePath: () => undefined
  }
});

mock.module("@/lib/email/emailService", {
  namedExports: {
    sendEmail: async () => ({ status: "SENT" })
  }
});

async function resetDatabase() {
  await prisma.notification.deleteMany();
  await prisma.deliveryAttempt.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.announcementReaction.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.chatReaction.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannelMembership.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let actions: any;

before(async () => {
  if (!hasDatabase) return;
  await applyMigrations();
  actions = await loadModuleFromRoot("server/actions/announcements");
  await prisma.$connect();
  await resetDatabase();
});

after(async () => {
  if (!hasDatabase) return;
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("chat-scoped announcements are visible only to chat members", async () => {
  const parish = await prisma.parish.create({ data: { name: "St Scope", slug: "st-scope" } });
  const admin = await prisma.user.create({
    data: { email: "admin.scope@test.com", passwordHash: "x", activeParishId: parish.id }
  });
  const member = await prisma.user.create({
    data: { email: "member.scope@test.com", passwordHash: "x", activeParishId: parish.id }
  });
  const outsider = await prisma.user.create({
    data: { email: "outsider.scope@test.com", passwordHash: "x", activeParishId: parish.id }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" },
      { parishId: parish.id, userId: outsider.id, role: "MEMBER" }
    ]
  });

  const group = await prisma.group.create({
    data: { parishId: parish.id, createdById: admin.id, name: "Choir" }
  });
  await prisma.groupMembership.create({
    data: { groupId: group.id, userId: member.id, status: "ACTIVE", role: "PARISHIONER" }
  });

  const groupChannel = await prisma.chatChannel.create({
    data: { parishId: parish.id, groupId: group.id, type: "GROUP", name: "Choir chat" }
  });

  await prisma.announcement.createMany({
    data: [
      {
        parishId: parish.id,
        title: "Parish update",
        body: "For everyone",
        scopeType: "PARISH",
        createdById: admin.id,
        publishedAt: new Date()
      },
      {
        parishId: parish.id,
        title: "Choir update",
        body: "For choir",
        scopeType: "CHAT",
        chatChannelId: groupChannel.id,
        createdById: admin.id,
        publishedAt: new Date()
      }
    ]
  });

  const memberList = await listAnnouncements({ parishId: parish.id, userId: member.id, status: "published" });
  const outsiderList = await listAnnouncements({
    parishId: parish.id,
    userId: outsider.id,
    status: "published"
  });

  assert.equal(memberList.length, 2);
  assert.equal(outsiderList.length, 1);
  assert.equal(outsiderList[0]?.title, "Parish update");

  const scoped = memberList.find((item) => item.title === "Choir update");
  assert.ok(scoped);

  const outsiderAccess = await getAnnouncement({
    parishId: parish.id,
    userId: outsider.id,
    announcementId: scoped!.id
  });
  assert.equal(outsiderAccess, null);
});

dbTest("chat scope filters audience selection for email/notifications", async () => {
  const parish = await prisma.parish.create({ data: { name: "St Filter", slug: "st-filter" } });
  const admin = await prisma.user.create({
    data: { email: "admin.filter@test.com", passwordHash: "x", activeParishId: parish.id }
  });
  const inChat = await prisma.user.create({
    data: { email: "inchat.filter@test.com", passwordHash: "x", activeParishId: parish.id }
  });
  const outChat = await prisma.user.create({
    data: { email: "outchat.filter@test.com", passwordHash: "x", activeParishId: parish.id }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: inChat.id, role: "MEMBER" },
      { parishId: parish.id, userId: outChat.id, role: "MEMBER" }
    ]
  });

  const group = await prisma.group.create({
    data: { parishId: parish.id, createdById: admin.id, name: "Servers" }
  });
  await prisma.groupMembership.create({
    data: { groupId: group.id, userId: inChat.id, status: "ACTIVE", role: "PARISHIONER" }
  });
  const channel = await prisma.chatChannel.create({
    data: { parishId: parish.id, groupId: group.id, type: "GROUP", name: "Servers chat" }
  });

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  const created = await actions.createAnnouncement({
    parishId: parish.id,
    title: "Servers only",
    body: "Scoped",
    scopeType: "CHAT",
    chatChannelId: channel.id,
    audienceUserIds: [inChat.id, outChat.id],
    published: false
  });

  const stored = await prisma.announcement.findUnique({ where: { id: created.id } });
  assert.deepEqual(stored?.audienceUserIds, [inChat.id]);

  const audience = await resolveAnnouncementAudience({
    parishId: parish.id,
    scopeType: "CHAT",
    chatChannelId: channel.id,
    audienceUserIds: [inChat.id, outChat.id]
  });
  assert.deepEqual(
    audience.map((item) => item.userId).sort(),
    [inChat.id]
  );
});

dbTest("announcement reactions enforce access and provide counts", async () => {
  const parish = await prisma.parish.create({ data: { name: "St React", slug: "st-react" } });
  const admin = await prisma.user.create({
    data: { email: "admin.react@test.com", passwordHash: "x", activeParishId: parish.id }
  });
  const member = await prisma.user.create({
    data: { email: "member.react@test.com", passwordHash: "x", activeParishId: parish.id }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" }
    ]
  });

  const announcement = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Reactable",
      body: "Body",
      scopeType: "PARISH",
      createdById: admin.id,
      publishedAt: new Date()
    }
  });

  session.user.id = member.id;
  session.user.activeParishId = parish.id;

  const first = await actions.toggleAnnouncementReaction({ announcementId: announcement.id, emoji: "🙏" });
  assert.equal(first.reactions[0]?.emoji, "🙏");
  assert.equal(first.reactions[0]?.count, 1);
  assert.equal(first.reactions[0]?.reactedByMe, true);

  const second = await actions.toggleAnnouncementReaction({ announcementId: announcement.id, emoji: "🙏" });
  assert.equal(second.reactions.length, 0);
});

dbTest("cross-parish users cannot view or react to announcements", async () => {
  const parishA = await prisma.parish.create({ data: { name: "St Alpha", slug: "st-alpha" } });
  const parishB = await prisma.parish.create({ data: { name: "St Beta", slug: "st-beta" } });

  const author = await prisma.user.create({
    data: { email: "author.scope@test.com", passwordHash: "x", activeParishId: parishA.id }
  });
  const outsider = await prisma.user.create({
    data: { email: "outsider.cross@test.com", passwordHash: "x", activeParishId: parishA.id }
  });

  await prisma.membership.create({
    data: { parishId: parishA.id, userId: author.id, role: "ADMIN" }
  });

  await prisma.membership.create({
    data: { parishId: parishB.id, userId: outsider.id, role: "MEMBER" }
  });

  const announcement = await prisma.announcement.create({
    data: {
      parishId: parishA.id,
      title: "Members only",
      body: "Scoped",
      scopeType: "PARISH",
      createdById: author.id,
      publishedAt: new Date()
    }
  });

  const list = await listAnnouncements({ parishId: parishA.id, userId: outsider.id, status: "published" });
  assert.equal(list.length, 0);

  const detail = await getAnnouncement({
    parishId: parishA.id,
    userId: outsider.id,
    announcementId: announcement.id
  });
  assert.equal(detail, null);

  session.user.id = outsider.id;
  session.user.activeParishId = parishA.id;

  await assert.rejects(
    actions.toggleAnnouncementReaction({ announcementId: announcement.id, emoji: "🙏" }),
    /Not found/
  );
});
