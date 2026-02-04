import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { sendPushToUser } from "@/lib/push/sendPush";

/**
 * Dev-only route to test push notifications for the current user.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await sendPushToUser(session.user.id, session.user.activeParishId, {
    title: "Test Notification",
    body: "Push notifications are working!",
    url: "/this-week",
    tag: "test"
  });

  return NextResponse.json({ ok: true });
}
