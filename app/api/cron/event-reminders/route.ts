import { NextResponse } from "next/server";
import { sendEventReminders } from "@/server/actions/eventReminders";

export async function GET() {
  const result = await sendEventReminders();
  return NextResponse.json(result);
}
