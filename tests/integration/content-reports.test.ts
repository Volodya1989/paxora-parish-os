import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { applyMigrations } from "../_helpers/migrate";
import { loadModuleFromRoot } from "../_helpers/load-module";

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

mock.module("@/lib/notifications/notify", {
  namedExports: {
    notifyContentReportSubmittedInApp: async () => undefined
  }
});

async function resetDatabase() {
  await prisma.contentReport.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannelMembership.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let actions: any;

before(async () => {
  if (!hasDatabase) return;
  await applyMigrations();
  actions = await loadModuleFromRoot("server/actions/content-reports");
  await prisma.$connect();
  await resetDatabase();
});

after(async () => {
  if (!hasDatabase) return;
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("submitContentReport enforces parish scoping for chat messages", async () => {
  const parishA = await prisma.parish.create({ data: { name: "Parish A", slug: "parish-a" } });
  const parishB = await prisma.parish.create({ data: { name: "Parish B", slug: "parish-b" } });

  const reporter = await prisma.user.create({
    data: {
      email: "reporter@example.com",
      passwordHash: "hash",
      activeParishId: parishA.id
    }
  });
  const authorB = await prisma.user.create({
    data: {
      email: "author-b@example.com",
      passwordHash: "hash",
      activeParishId: parishB.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parishA.id, userId: reporter.id, role: "MEMBER" },
      { parishId: parishB.id, userId: authorB.id, role: "MEMBER" }
    ]
  });

  const channelB = await prisma.chatChannel.create({
    data: {
      parishId: parishB.id,
      type: "PARISH",
      name: "Community"
    }
  });

  const messageB = await prisma.chatMessage.create({
    data: {
      channelId: channelB.id,
      authorId: authorB.id,
      body: "hello from B"
    }
  });

  session.user.id = reporter.id;
  session.user.activeParishId = parishA.id;

  await assert.rejects(() =>
    actions.submitContentReport({
      contentType: "CHAT_MESSAGE",
      contentId: messageB.id,
      reason: "This message is inappropriate and harmful"
    })
  );
});

dbTest("submitContentReport rejects empty or too-short reason", async () => {
  const parish = await prisma.parish.create({ data: { name: "Parish V", slug: "parish-v" } });
  const user = await prisma.user.create({
    data: {
      email: "reporter-v@example.com",
      passwordHash: "hash",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: { parishId: parish.id, userId: user.id, role: "MEMBER" }
  });

  const announcement = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Test",
      body: "Body",
      publishedAt: new Date()
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  // No reason at all
  await assert.rejects(
    () =>
      actions.submitContentReport({
        contentType: "ANNOUNCEMENT",
        contentId: announcement.id
      }),
    { message: "Reason is required (minimum 10 characters)" }
  );

  // Empty string
  await assert.rejects(
    () =>
      actions.submitContentReport({
        contentType: "ANNOUNCEMENT",
        contentId: announcement.id,
        reason: ""
      }),
    { message: "Reason is required (minimum 10 characters)" }
  );

  // Too short (under 10 chars)
  await assert.rejects(
    () =>
      actions.submitContentReport({
        contentType: "ANNOUNCEMENT",
        contentId: announcement.id,
        reason: "short"
      }),
    { message: "Reason is required (minimum 10 characters)" }
  );

  // Whitespace-only
  await assert.rejects(
    () =>
      actions.submitContentReport({
        contentType: "ANNOUNCEMENT",
        contentId: announcement.id,
        reason: "         "
      }),
    { message: "Reason is required (minimum 10 characters)" }
  );
});

dbTest("submitContentReport succeeds with valid reason", async () => {
  const parish = await prisma.parish.create({ data: { name: "Parish S", slug: "parish-s" } });
  const user = await prisma.user.create({
    data: {
      email: "reporter-s@example.com",
      passwordHash: "hash",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: { parishId: parish.id, userId: user.id, role: "MEMBER" }
  });

  const announcement = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Test Success",
      body: "Body",
      publishedAt: new Date()
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const result = await actions.submitContentReport({
    contentType: "ANNOUNCEMENT",
    contentId: announcement.id,
    reason: "This announcement contains misleading information"
  });

  assert.equal(result.duplicate, false);
  assert.ok(result.id);

  const stored = await prisma.contentReport.findUnique({ where: { id: result.id } });
  assert.equal(stored?.reason, "This announcement contains misleading information");
  assert.equal(stored?.status, "OPEN");
});

dbTest("submitContentReport deduplicates same reporter/content pair", async () => {
  const parish = await prisma.parish.create({ data: { name: "Parish C", slug: "parish-c" } });
  const user = await prisma.user.create({
    data: {
      email: "reporter-c@example.com",
      passwordHash: "hash",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: user.id,
      role: "MEMBER"
    }
  });

  const announcement = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Published",
      body: "Body",
      publishedAt: new Date()
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const first = await actions.submitContentReport({
    contentType: "ANNOUNCEMENT",
    contentId: announcement.id,
    reason: "Abusive content that needs review"
  });
  const second = await actions.submitContentReport({
    contentType: "ANNOUNCEMENT",
    contentId: announcement.id,
    reason: "Duplicate report with updated reason"
  });

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);

  const reports = await prisma.contentReport.findMany({
    where: {
      parishId: parish.id,
      reporterUserId: user.id,
      contentType: "ANNOUNCEMENT",
      contentId: announcement.id
    }
  });

  assert.equal(reports.length, 1);
});

dbTest("updateContentReportStatus requires admin/shepherd", async () => {
  const parish = await prisma.parish.create({ data: { name: "Parish D", slug: "parish-d" } });

  const admin = await prisma.user.create({
    data: {
      email: "admin-d@example.com",
      passwordHash: "hash",
      activeParishId: parish.id
    }
  });
  const member = await prisma.user.create({
    data: {
      email: "member-d@example.com",
      passwordHash: "hash",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" }
    ]
  });

  const report = await prisma.contentReport.create({
    data: {
      parishId: parish.id,
      reporterUserId: member.id,
      contentType: "GROUP_CONTENT",
      contentId: "group-xyz",
      reason: "This group contains inappropriate content"
    }
  });

  session.user.id = member.id;
  session.user.activeParishId = parish.id;

  await assert.rejects(() =>
    actions.updateContentReportStatus({
      reportId: report.id,
      status: "REVIEWED"
    })
  );

  session.user.id = admin.id;

  await actions.updateContentReportStatus({
    reportId: report.id,
    status: "DISMISSED"
  });

  const stored = await prisma.contentReport.findUnique({ where: { id: report.id } });
  assert.equal(stored?.status, "DISMISSED");
  assert.equal(stored?.reviewerUserId, admin.id);
});

dbTest("listParishContentReports requires admin/shepherd", async () => {
  const parish = await prisma.parish.create({ data: { name: "Parish L", slug: "parish-l" } });

  const member = await prisma.user.create({
    data: {
      email: "member-l@example.com",
      passwordHash: "hash",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: { parishId: parish.id, userId: member.id, role: "MEMBER" }
  });

  session.user.id = member.id;
  session.user.activeParishId = parish.id;

  await assert.rejects(() => actions.listParishContentReports());
});
