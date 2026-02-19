import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { prisma } from "@/server/db/prisma";
import { getNow } from "@/lib/time/getNow";

/**
 * Vercel cron should hit this route every Monday at 01:00 UTC.
 * (If local parish timezone scheduling is needed later, convert before calling.)
 */
export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const now = getNow();

  const result = await prisma.request.updateMany({
    where: {
      archivedAt: null,
      deletedAt: null,
      status: "COMPLETED"
    },
    data: {
      archivedAt: now,
      archivedReason: "AUTO_WEEKLY"
    }
  });

  console.info("[cron][archive-completed-requests] archived", {
    archived: result.count,
    ranAt: now.toISOString()
  });

  return NextResponse.json({ archived: result.count, ranAt: now.toISOString() });
}
