import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getNotificationItems } from "@/lib/queries/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getNotificationItems(
      session.user.id,
      session.user.activeParishId
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("[notifications] Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
