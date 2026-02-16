import { NextResponse } from "next/server";
import { sendEventReminders } from "@/server/actions/eventReminders";
import { requireCronSecret } from "@/lib/cron/auth";

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await sendEventReminders();
  return NextResponse.json(result);
}
