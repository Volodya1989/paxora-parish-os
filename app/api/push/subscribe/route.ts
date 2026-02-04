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

  const { endpoint, keys } = body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (
    !endpoint ||
    typeof endpoint !== "string" ||
    !keys?.p256dh ||
    typeof keys.p256dh !== "string" ||
    !keys?.auth ||
    typeof keys.auth !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing required fields: endpoint, keys.p256dh, keys.auth" },
      { status: 400 }
    );
  }

  // Validate endpoint is a URL
  try {
    new URL(endpoint);
  } catch {
    return NextResponse.json({ error: "Invalid endpoint URL" }, { status: 400 });
  }

  try {
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId, endpoint }
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        parishId
      },
      create: {
        userId,
        parishId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push/subscribe] Error saving subscription:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}
