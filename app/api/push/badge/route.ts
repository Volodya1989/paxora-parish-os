import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getBadgeCount } from "@/lib/push/badge";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await getBadgeCount(session.user.id, session.user.activeParishId);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("[push/badge] Error computing badge count:", error);
    return NextResponse.json({ error: "Failed to compute badge" }, { status: 500 });
  }
}
