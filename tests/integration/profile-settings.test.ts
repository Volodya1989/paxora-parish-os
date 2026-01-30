import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

const session = {
  user: {
    id: ""
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
  await prisma.eventRsvp.deleteMany();
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let actions: typeof import("@/app/actions/profile");

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  const loaded = (await loadModuleFromRoot("app/actions/profile")) as Record<string, unknown>;
  const direct = loaded.updateProfileSettings;
  const defaultModule = loaded.default as Record<string, unknown> | undefined;
  const nestedDefault = defaultModule?.default as Record<string, unknown> | undefined;
  const resolved =
    typeof direct === "function"
      ? loaded
      : typeof defaultModule?.updateProfileSettings === "function"
        ? defaultModule
        : typeof nestedDefault?.updateProfileSettings === "function"
          ? nestedDefault
          : loaded;
  actions = resolved as typeof import("@/app/actions/profile");
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

test.skip("updateProfileSettings persists and returns updated settings", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Agnes", slug: "st-agnes" }
  });
  const user = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id,
      notificationsEnabled: true,
      weeklyDigestEnabled: false
    }
  });

  session.user.id = user.id;

  const result = await actions.updateProfileSettings({
    notificationsEnabled: false,
    weeklyDigestEnabled: true,
    volunteerHoursOptIn: true
  });

  assert.equal(result.notificationsEnabled, false);
  assert.equal(result.weeklyDigestEnabled, true);
  assert.equal(result.volunteerHoursOptIn, true);

  const stored = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      notificationsEnabled: true,
      weeklyDigestEnabled: true,
      volunteerHoursOptIn: true
    }
  });

  assert.equal(stored?.notificationsEnabled, false);
  assert.equal(stored?.weeklyDigestEnabled, true);
  assert.equal(stored?.volunteerHoursOptIn, true);
});
