import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const parishId = session.user.activeParishId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint } = body as { endpoint?: string };

  if (!endpoint || typeof endpoint !== "string") {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: { userId, parishId, endpoint }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push/unsubscribe] Error removing subscription:", error);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
