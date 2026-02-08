import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getNow } from "@/lib/time/getNow";

/**
 * Schedule this route with a cron job to run Sundays at 00:00 (server time).
 * Archives completed/canceled requests so they no longer appear in default views.
 */
export async function GET() {
  const now = getNow();

  const result = await prisma.request.updateMany({
    where: {
      archivedAt: null,
      status: { in: ["COMPLETED", "CANCELED"] }
    },
    data: {
      archivedAt: now,
      archivedReason: "AUTO_WEEKLY"
    }
  });

  return NextResponse.json({ archived: result.count });
}
