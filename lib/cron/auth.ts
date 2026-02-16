import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Vercel Cron pattern:
 * Authorization: Bearer <CRON_SECRET>
 */
export function requireCronSecret(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || !authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expected = `Bearer ${cronSecret}`;
  if (
    expected.length !== authorization.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(authorization))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
