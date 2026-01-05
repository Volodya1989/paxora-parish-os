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

  await prisma.user.update({
    where: { id: user.id },
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

  await prisma.task.createMany({
    data: [
      {
        parishId: parish.id,
        weekId: week.id,
        ownerId: user.id,
        title: "Prepare Sunday liturgy sheet"
      },
      {
        parishId: parish.id,
        weekId: week.id,
        ownerId: user.id,
        title: "Confirm volunteer schedule"
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
