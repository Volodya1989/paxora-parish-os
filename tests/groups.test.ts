import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { getGroupDetail, listGroups } from "@/domain/groups";

async function resetDatabase() {
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  await prisma.$connect();
  await resetDatabase();
});

after(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

test("listGroups returns only groups in the requested parish", async () => {
  const parishA = await prisma.parish.create({
    data: { name: "St. Anne", slug: "st-anne" }
  });
  const parishB = await prisma.parish.create({
    data: { name: "St. Benedict", slug: "st-benedict" }
  });

  const groupA = await prisma.group.create({
    data: { parishId: parishA.id, name: "Choir" }
  });
  await prisma.group.create({
    data: { parishId: parishB.id, name: "Hospitality" }
  });

  const groups = await listGroups(parishA.id);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.id, groupA.id);
});

test("getGroupDetail returns group members and current-week tasks", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Catherine", slug: "st-catherine" }
  });

  const leader = await prisma.user.create({
    data: {
      email: "leader@example.com",
      name: "Anna Leader",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const member = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Brian Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  const group = await prisma.group.create({
    data: { parishId: parish.id, name: "Greeters", description: "Welcome team" }
  });

  await prisma.groupMembership.createMany({
    data: [
      { groupId: group.id, userId: leader.id, role: "LEAD" },
      { groupId: group.id, userId: member.id, role: "MEMBER" }
    ]
  });

  const currentWeek = await getOrCreateCurrentWeek(parish.id);
  const previousStart = new Date(currentWeek.startsOn);
  previousStart.setDate(previousStart.getDate() - 7);
  const previousEnd = new Date(currentWeek.startsOn);
  const previousWeek = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: previousStart,
      endsOn: previousEnd,
      label: "previous-week"
    }
  });

  const currentTask = await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: currentWeek.id,
      groupId: group.id,
      ownerId: leader.id,
      title: "Prepare welcome packets"
    }
  });

  await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: previousWeek.id,
      groupId: group.id,
      ownerId: leader.id,
      title: "Old task"
    }
  });

  const otherGroup = await prisma.group.create({
    data: { parishId: parish.id, name: "Usher Team" }
  });
  await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: currentWeek.id,
      groupId: otherGroup.id,
      ownerId: leader.id,
      title: "Other group task"
    }
  });

  const detail = await getGroupDetail({ parishId: parish.id, groupId: group.id });

  assert.equal(detail.group.id, group.id);
  assert.equal(detail.group.name, "Greeters");
  assert.equal(detail.group.description, "Welcome team");
  assert.deepEqual(
    detail.members.map((user) => user.id).sort(),
    [leader.id, member.id].sort()
  );
  assert.equal(detail.tasks.length, 1);
  assert.equal(detail.tasks[0]?.id, currentTask.id);
});
