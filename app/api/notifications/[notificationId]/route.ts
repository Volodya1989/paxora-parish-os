import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { deleteNotificationForUser } from "@/lib/notifications/store";

export async function DELETE(
  _: Request,
  context: { params: Promise<{ notificationId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await context.params;
  if (!notificationId) {
    return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  }

  const result = await deleteNotificationForUser({
    notificationId,
    userId: session.user.id,
    parishId: session.user.activeParishId
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
