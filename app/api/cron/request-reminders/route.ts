import { NextResponse } from "next/server";
import { sendRequestOverdueReminders } from "@/server/actions/requestReminders";

export async function GET() {
  const result = await sendRequestOverdueReminders();
  return NextResponse.json(result);
}
