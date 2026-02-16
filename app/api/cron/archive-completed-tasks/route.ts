import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getNow } from "@/lib/time/getNow";
import { autoArchiveCompletedTasksForParish } from "@/domain/tasks";

export async function GET() {
  const now = getNow();
  const parishes = await prisma.parish.findMany({
    select: { id: true, timezone: true }
  });

  const results: Array<{ parishId: string; timezone: string; archived: number }> = [];
  let archived = 0;

  for (const parish of parishes) {
    const result = await autoArchiveCompletedTasksForParish({
      parishId: parish.id,
      timezone: parish.timezone || "UTC",
      now
    });
    archived += result.archived;
    results.push({ parishId: parish.id, timezone: parish.timezone || "UTC", archived: result.archived });
  }

  return NextResponse.json({
    archived,
    parishes: results
  });
}
