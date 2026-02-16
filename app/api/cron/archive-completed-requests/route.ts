import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { prisma } from "@/server/db/prisma";
import { getNow } from "@/lib/time/getNow";

/**
 * Schedule this route with a cron job to run Sundays at 00:00 (server time).
 * Archives completed/canceled requests so they no longer appear in default views.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

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
