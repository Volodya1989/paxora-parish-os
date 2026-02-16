import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { sendRequestOverdueReminders } from "@/server/actions/requestReminders";

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await sendRequestOverdueReminders();
  return NextResponse.json(result);
}
