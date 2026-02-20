import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { applyMigrations } from "../_helpers/migrate";
import { joinParishByCode } from "@/lib/parish/joinByCode";
import { createParishInviteCode } from "@/lib/parish/inviteCode";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

async function resetDatabase() {
  await prisma.accessRequest.deleteMany();
  await prisma.membership.deleteMany();
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

dbTest("create parish stores invite code", async () => {
  const code = await createParishInviteCode();
  const parish = await prisma.parish.create({
    data: {
      name: "St. Code",
      slug: "st-code",
      inviteCode: code,
      inviteCodeCreatedAt: new Date()
    }
  });

  assert.ok(parish.inviteCode);
  assert.equal(parish.inviteCode?.length, 7);
});

dbTest("join by valid/invalid/already-member code", async () => {
  const parishCode = await createParishInviteCode();
  const parish = await prisma.parish.create({
    data: {
      name: "St. Join",
      slug: "st-join",
      inviteCode: parishCode,
      inviteCodeCreatedAt: new Date()
    }
  });

  const user = await prisma.user.create({
    data: {
      email: "joiner@example.com",
      name: "Joiner",
      passwordHash: "hashed"
    }
  });

  const invalid = await joinParishByCode(user.id, "BADCODE");
  assert.equal(invalid.status, "invalid_code");

  const joined = await joinParishByCode(user.id, parish.inviteCode ?? "");
  assert.equal(joined.status, "joined");

  const membership = await prisma.membership.findUnique({
    where: { parishId_userId: { parishId: parish.id, userId: user.id } }
  });
  assert.ok(membership);
  assert.equal(membership?.role, "MEMBER");

  const already = await joinParishByCode(user.id, parish.inviteCode ?? "");
  assert.equal(already.status, "already_member");
});
