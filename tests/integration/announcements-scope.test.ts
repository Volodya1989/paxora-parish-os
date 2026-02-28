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

async function resetDatabase() {
  await prisma.announcementComment.deleteMany();
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
    published: true
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


dbTest("announcement comments enforce scoped visibility and deletion rules", async () => {
  const parish = await prisma.parish.create({ data: { name: "St Comments", slug: "st-comments" } });
  const admin = await prisma.user.create({
    data: { email: "admin.comments@test.com", passwordHash: "x", activeParishId: parish.id }
  });
  const author = await prisma.user.create({
    data: { email: "author.comments@test.com", passwordHash: "x", activeParishId: parish.id }
  });
  const member = await prisma.user.create({
    data: { email: "member.comments@test.com", passwordHash: "x", activeParishId: parish.id }
  });
  const outsider = await prisma.user.create({
    data: { email: "outsider.comments@test.com", passwordHash: "x", activeParishId: parish.id }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: author.id, role: "MEMBER" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" },
      { parishId: parish.id, userId: outsider.id, role: "MEMBER" }
    ]
  });

  const group = await prisma.group.create({
    data: { parishId: parish.id, createdById: admin.id, name: "Readers" }
  });
  await prisma.groupMembership.createMany({
    data: [
      { groupId: group.id, userId: author.id, status: "ACTIVE", role: "PARISHIONER" },
      { groupId: group.id, userId: member.id, status: "ACTIVE", role: "PARISHIONER" }
    ]
  });

  const channel = await prisma.chatChannel.create({
    data: { parishId: parish.id, groupId: group.id, type: "GROUP", name: "Readers chat" }
  });

  const announcement = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      scopeType: "CHAT",
      chatChannelId: channel.id,
      title: "Readers only",
      body: "Scoped post",
      createdById: author.id,
      publishedAt: new Date()
    }
  });

  session.user.id = member.id;
  session.user.activeParishId = parish.id;

  const created = await actions.createAnnouncementComment({
    announcementId: announcement.id,
    content: "Thanks for sharing"
  });
  assert.equal(created.content, "Thanks for sharing");

  const listed = await actions.listAnnouncementComments({ announcementId: announcement.id });
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.author.id, member.id);

  const edited = await actions.updateAnnouncementComment({
    commentId: created.id,
    content: "Edited comment"
  });
  assert.equal(edited.content, "Edited comment");

  session.user.id = outsider.id;
  await assert.rejects(
    actions.listAnnouncementComments({ announcementId: announcement.id }),
    /Not found/
  );
  await assert.rejects(
    actions.createAnnouncementComment({ announcementId: announcement.id, content: "hi" }),
    /Not found/
  );
  await assert.rejects(
    actions.updateAnnouncementComment({ commentId: created.id, content: "hack" }),
    /Not found/
  );

  session.user.id = author.id;
  await actions.deleteAnnouncementComment({ commentId: created.id });
  const afterDelete = await prisma.announcementComment.findUnique({ where: { id: created.id } });
  assert.equal(afterDelete, null);
});

dbTest("announcement comments reject invalid content and enforce own-comment delete", async () => {
  const parish = await prisma.parish.create({ data: { name: "St Limits", slug: "st-limits" } });
  const admin = await prisma.user.create({
    data: { email: "admin.limits@test.com", passwordHash: "x", activeParishId: parish.id }
  });
  const memberA = await prisma.user.create({
    data: { email: "membera.limits@test.com", passwordHash: "x", activeParishId: parish.id }
  });
  const memberB = await prisma.user.create({
    data: { email: "memberb.limits@test.com", passwordHash: "x", activeParishId: parish.id }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: memberA.id, role: "MEMBER" },
      { parishId: parish.id, userId: memberB.id, role: "MEMBER" }
    ]
  });

  const announcement = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      scopeType: "PARISH",
      title: "All parish",
      body: "Post",
      createdById: admin.id,
      publishedAt: new Date()
    }
  });

  session.user.id = memberA.id;
  session.user.activeParishId = parish.id;

  await assert.rejects(
    actions.createAnnouncementComment({ announcementId: announcement.id, content: "   " }),
    /Comment is required/
  );

  await assert.rejects(
    actions.createAnnouncementComment({ announcementId: announcement.id, content: "x".repeat(1001) }),
    /characters or fewer/
  );

  const comment = await actions.createAnnouncementComment({
    announcementId: announcement.id,
    content: "Valid comment"
  });

  await assert.rejects(
    actions.updateAnnouncementComment({ commentId: comment.id, content: "   " }),
    /Comment is required/
  );

  session.user.id = memberB.id;
  await assert.rejects(actions.updateAnnouncementComment({ commentId: comment.id, content: "nope" }), /Forbidden/);
  await assert.rejects(actions.deleteAnnouncementComment({ commentId: comment.id }), /Forbidden/);

  session.user.id = memberA.id;
  const updatedByOwner = await actions.updateAnnouncementComment({
    commentId: comment.id,
    content: "Owner edit"
  });
  assert.equal(updatedByOwner.content, "Owner edit");

  session.user.id = admin.id;
  await actions.deleteAnnouncementComment({ commentId: comment.id });
  const removed = await prisma.announcementComment.findUnique({ where: { id: comment.id } });
  assert.equal(removed, null);
});
