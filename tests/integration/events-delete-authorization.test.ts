import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { applyMigrations } from "../_helpers/migrate";
import { loadModuleFromRoot } from "../_helpers/load-module";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

let resolveEventDeleteAuthorization: any;

async function resetDatabase() {
  await prisma.event.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  if (!hasDatabase) {
    return;
  }

  await applyMigrations();
  const eventActions = (await loadModuleFromRoot("server/actions/events")) as Record<string, unknown>
  resolveEventDeleteAuthorization = eventActions.resolveEventDeleteAuthorization;
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

dbTest("resolveEventDeleteAuthorization enforces not-found, role and group rules", async () => {
  const [parishA, parishB] = await Promise.all([
    prisma.parish.create({ data: { name: "St A", slug: "st-a" } }),
    prisma.parish.create({ data: { name: "St B", slug: "st-b" } })
  ]);

  const [admin, shepherd, member, outsider] = await Promise.all([
    prisma.user.create({ data: { email: "admin-events@example.com", name: "Admin", passwordHash: "x" } }),
    prisma.user.create({ data: { email: "shepherd-events@example.com", name: "Shepherd", passwordHash: "x" } }),
    prisma.user.create({ data: { email: "member-events@example.com", name: "Member", passwordHash: "x" } }),
    prisma.user.create({ data: { email: "outsider-events@example.com", name: "Outsider", passwordHash: "x" } })
  ]);

  await prisma.membership.createMany({
    data: [
      { parishId: parishA.id, userId: admin.id, role: "ADMIN" },
      { parishId: parishA.id, userId: shepherd.id, role: "SHEPHERD" },
      { parishId: parishA.id, userId: member.id, role: "MEMBER" },
      { parishId: parishA.id, userId: outsider.id, role: "MEMBER" }
    ]
  });

  const week = await prisma.week.create({
    data: {
      parishId: parishA.id,
      startsOn: new Date("2026-02-23T00:00:00.000Z"),
      endsOn: new Date("2026-03-01T23:59:59.000Z"),
      label: "Week"
    }
  });

  const group = await prisma.group.create({
    data: {
      parishId: parishA.id,
      createdById: admin.id,
      name: "Choir",
      status: "ACTIVE"
    }
  });

  await prisma.groupMembership.create({
    data: {
      groupId: group.id,
      userId: member.id,
      role: "PARISHIONER",
      status: "ACTIVE"
    }
  });

  const event = await prisma.event.create({
    data: {
      parishId: parishA.id,
      weekId: week.id,
      groupId: group.id,
      title: "Vespers",
      startsAt: new Date("2026-02-25T19:00:00.000Z"),
      endsAt: new Date("2026-02-25T20:00:00.000Z")
    }
  });

  const notFound = await resolveEventDeleteAuthorization({
    eventId: event.id,
    parishId: parishB.id,
    userId: admin.id,
    userRole: "ADMIN"
  });
  assert.equal(notFound.status, "not_found");

  const asAdmin = await resolveEventDeleteAuthorization({
    eventId: event.id,
    parishId: parishA.id,
    userId: admin.id,
    userRole: "ADMIN"
  });
  assert.equal(asAdmin.status, "authorized");

  const asShepherd = await resolveEventDeleteAuthorization({
    eventId: event.id,
    parishId: parishA.id,
    userId: shepherd.id,
    userRole: "SHEPHERD"
  });
  assert.equal(asShepherd.status, "authorized");

  const asGroupMember = await resolveEventDeleteAuthorization({
    eventId: event.id,
    parishId: parishA.id,
    userId: member.id,
    userRole: "MEMBER"
  });
  assert.equal(asGroupMember.status, "authorized");

  const asOutsiderMember = await resolveEventDeleteAuthorization({
    eventId: event.id,
    parishId: parishA.id,
    userId: outsider.id,
    userRole: "MEMBER"
  });
  assert.equal(asOutsiderMember.status, "forbidden");
});
