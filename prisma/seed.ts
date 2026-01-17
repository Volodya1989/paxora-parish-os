import bcrypt from "bcryptjs";
import { prisma } from "../server/db/prisma";
import { getWeekStartMonday, getWeekLabel } from "../domain/week";

async function main() {
  const existingParish = await prisma.parish.findFirst();

  if (existingParish) {
    return;
  }

  const password = process.env.SEED_DEMO_PASSWORD ?? "password123";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: "Demo Shepherd",
      email: "demo@paxora.local",
      passwordHash
    }
  });

  const coordinator = await prisma.user.create({
    data: {
      name: "Demo Coordinator",
      email: "coordinator@paxora.local",
      passwordHash
    }
  });

  const parishioner = await prisma.user.create({
    data: {
      name: "Demo Parishioner",
      email: "parishioner@paxora.local",
      passwordHash
    }
  });

  const invited = await prisma.user.create({
    data: {
      name: "Invited Parishioner",
      email: "invited@paxora.local",
      passwordHash
    }
  });

  const parish = await prisma.parish.create({
    data: {
      name: "St. Paxora Parish",
      slug: "st-paxora"
    }
  });

  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: user.id,
      role: "SHEPHERD"
    }
  });

  await prisma.membership.createMany({
    data: [
      {
        parishId: parish.id,
        userId: coordinator.id,
        role: "MEMBER"
      },
      {
        parishId: parish.id,
        userId: parishioner.id,
        role: "MEMBER"
      },
      {
        parishId: parish.id,
        userId: invited.id,
        role: "MEMBER"
      }
    ]
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { activeParishId: parish.id }
  });

  await prisma.user.updateMany({
    where: { id: { in: [coordinator.id, parishioner.id, invited.id] } },
    data: { activeParishId: parish.id }
  });

  const start = getWeekStartMonday(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const week = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: start,
      endsOn: end,
      label: getWeekLabel(start)
    }
  });

  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      name: "Hospitality",
      description: "Welcome and care ministry"
    }
  });

  await prisma.groupMembership.createMany({
    data: [
      {
        groupId: group.id,
        userId: coordinator.id,
        role: "COORDINATOR",
        status: "ACTIVE"
      },
      {
        groupId: group.id,
        userId: parishioner.id,
        role: "PARISHIONER",
        status: "ACTIVE"
      },
      {
        groupId: group.id,
        userId: invited.id,
        role: "PARISHIONER",
        status: "INVITED",
        invitedByUserId: coordinator.id,
        invitedEmail: invited.email
      }
    ]
  });

  await prisma.task.createMany({
    data: [
      {
        parishId: parish.id,
        weekId: week.id,
        ownerId: user.id,
        createdById: user.id,
        title: "Prepare Sunday liturgy sheet",
        visibility: "PUBLIC",
        approvalStatus: "APPROVED"
      },
      {
        parishId: parish.id,
        weekId: week.id,
        ownerId: user.id,
        createdById: user.id,
        title: "Confirm volunteer schedule",
        visibility: "PUBLIC",
        approvalStatus: "APPROVED"
      }
    ]
  });

  await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      title: "Sunday Liturgy",
      startsAt: new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000),
      endsAt: new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      location: "Main Sanctuary"
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
