import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { listAnnouncements } from "@/lib/queries/announcements";
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
  actions = await loadModuleFromRoot("server/actions/announcements");
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

dbTest("draft and published lists update with publish and archive actions", async () => {
  const now = new Date("2024-04-01T12:00:00.000Z");

  const parish = await prisma.parish.create({
    data: { name: "St. Anne", slug: "st-anne" }
  });
  const user = await prisma.user.create({
    data: {
      email: "announcements@example.com",
      name: "Announcements Lead",
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

  const draft = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Draft message",
      body: "Draft details",
      createdById: user.id,
      createdAt: now,
      updatedAt: now
    }
  });
  const published = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Published update",
      body: "Published details",
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
      publishedAt: new Date("2024-03-20T09:00:00.000Z")
    }
  });
  await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Archived update",
      body: "Archived details",
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
      publishedAt: new Date("2024-03-15T09:00:00.000Z"),
      archivedAt: new Date("2024-03-25T09:00:00.000Z")
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const draftList = await listAnnouncements({ parishId: parish.id, userId: user.id, status: "draft" });
  const publishedList = await listAnnouncements({ parishId: parish.id, userId: user.id, status: "published" });

  assert.equal(draftList.length, 1);
  assert.equal(draftList[0]?.id, draft.id);
  assert.equal(publishedList.length, 1);
  assert.equal(publishedList[0]?.id, published.id);

  await actions.setAnnouncementPublished({
    id: draft.id,
    published: true,
    getNow: () => now
  });

  const updatedDraftList = await listAnnouncements({ parishId: parish.id, userId: user.id, status: "draft" });
  const updatedPublishedList = await listAnnouncements({ parishId: parish.id, userId: user.id, status: "published" });
  assert.equal(updatedDraftList.length, 0);
  assert.equal(updatedPublishedList.length, 2);

  const stored = await prisma.announcement.findUnique({ where: { id: draft.id } });
  assert.equal(stored?.publishedAt?.toISOString(), now.toISOString());

  await actions.archiveAnnouncement({ id: published.id, getNow: () => now });
  const afterArchivePublished = await listAnnouncements({
    parishId: parish.id,
    userId: user.id,
    status: "published"
  });
  assert.equal(afterArchivePublished.length, 1);
  assert.equal(afterArchivePublished[0]?.id, draft.id);

  await actions.unarchiveAnnouncement({ id: published.id });
  const afterUndoArchive = await listAnnouncements({
    parishId: parish.id,
    userId: user.id,
    status: "published"
  });
  assert.equal(afterUndoArchive.length, 2);
});

dbTest("create, update, and delete announcement enforce permissions", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Bridget", slug: "st-bridget" }
  });
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const member = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Member",
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
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: member.id,
      role: "MEMBER"
    }
  });

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  const created = await actions.createAnnouncement({
    parishId: parish.id,
    title: "New update",
    body: "Hello parishioners",
    published: true,
    getNow: () => new Date("2024-04-02T10:00:00.000Z")
  });

  const stored = await prisma.announcement.findUnique({ where: { id: created.id } });
  assert.equal(stored?.title, "New update");
  assert.equal(stored?.body, "Hello parishioners");

  await actions.updateAnnouncement({
    id: created.id,
    title: "Updated update",
    body: "Updated body",
    published: false,
    getNow: () => new Date("2024-04-03T10:00:00.000Z")
  });

  const updated = await prisma.announcement.findUnique({ where: { id: created.id } });
  assert.equal(updated?.title, "Updated update");
  assert.equal(updated?.publishedAt, null);

  session.user.id = member.id;
  session.user.activeParishId = parish.id;
  await assert.rejects(() =>
    actions.createAnnouncement({
      parishId: parish.id,
      title: "Member update",
      body: "Not allowed",
      published: true
    })
  );

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;
  await actions.deleteAnnouncement({ id: created.id });
  const deleted = await prisma.announcement.findUnique({ where: { id: created.id } });
  assert.equal(deleted, null);
});
