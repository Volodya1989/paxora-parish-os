import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getNotificationUnreadCount } from "@/lib/queries/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await getNotificationUnreadCount(session.user.id, session.user.activeParishId);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[push/badge] unreadCount", count, "user", session.user.id);
    }
    return NextResponse.json({ count });
  } catch (error) {
    console.error("[push/badge] Error computing badge count:", error);
    return NextResponse.json({ error: "Failed to compute badge" }, { status: 500 });
  }
}
