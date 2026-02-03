import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getNow } from "@/lib/time/getNow";
import { getWeekForSelection } from "@/domain/week";

export async function GET() {
  const now = getNow();
  const parishes = await prisma.parish.findMany({
    select: { id: true }
  });

  let archived = 0;

  for (const parish of parishes) {
    const currentWeek = await getWeekForSelection(parish.id, "current", now);
    const result = await prisma.task.updateMany({
      where: {
        parishId: parish.id,
        archivedAt: null,
        status: "DONE",
        weekId: { not: currentWeek.id }
      },
      data: { archivedAt: now }
    });
    archived += result.count;
  }

  return NextResponse.json({ archived });
}
