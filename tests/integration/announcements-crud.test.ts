import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { listAnnouncements } from "@/lib/queries/announcements";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = test.skip;

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

let actions: typeof import("@/server/actions/announcements");

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
      createdAt: now,
      updatedAt: now
    }
  });
  const published = await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Published update",
      createdAt: now,
      updatedAt: now,
      publishedAt: new Date("2024-03-20T09:00:00.000Z")
    }
  });
  await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Archived update",
      createdAt: now,
      updatedAt: now,
      publishedAt: new Date("2024-03-15T09:00:00.000Z"),
      archivedAt: new Date("2024-03-25T09:00:00.000Z")
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const draftList = await listAnnouncements({ parishId: parish.id, status: "draft" });
  const publishedList = await listAnnouncements({ parishId: parish.id, status: "published" });

  assert.equal(draftList.length, 1);
  assert.equal(draftList[0]?.id, draft.id);
  assert.equal(publishedList.length, 1);
  assert.equal(publishedList[0]?.id, published.id);

  await actions.setAnnouncementPublished({
    id: draft.id,
    published: true,
    getNow: () => now
  });

  const updatedDraftList = await listAnnouncements({ parishId: parish.id, status: "draft" });
  const updatedPublishedList = await listAnnouncements({ parishId: parish.id, status: "published" });
  assert.equal(updatedDraftList.length, 0);
  assert.equal(updatedPublishedList.length, 2);

  const stored = await prisma.announcement.findUnique({ where: { id: draft.id } });
  assert.equal(stored?.publishedAt?.toISOString(), now.toISOString());

  await actions.archiveAnnouncement({ id: published.id, getNow: () => now });
  const afterArchivePublished = await listAnnouncements({
    parishId: parish.id,
    status: "published"
  });
  assert.equal(afterArchivePublished.length, 1);
  assert.equal(afterArchivePublished[0]?.id, draft.id);

  await actions.unarchiveAnnouncement({ id: published.id });
  const afterUndoArchive = await listAnnouncements({
    parishId: parish.id,
    status: "published"
  });
  assert.equal(afterUndoArchive.length, 2);
});
