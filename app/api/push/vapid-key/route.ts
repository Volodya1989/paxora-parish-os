import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push/vapid";

export async function GET() {
  const key = getVapidPublicKey();

  if (!key) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 503 });
  }

  return NextResponse.json({ publicKey: key });
}
