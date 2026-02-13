import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { listMentionableUsersForChannel, listMentionableUsersForTask } from "@/lib/mentions/permissions";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const channelId = searchParams.get("channelId") ?? undefined;
    const taskId = searchParams.get("taskId") ?? undefined;

    if (!channelId && !taskId) {
      return NextResponse.json({ error: "channelId or taskId is required" }, { status: 400 });
    }

    const parishId = session.user.activeParishId;
    const actorUserId = session.user.id;

    const users = channelId
      ? await listMentionableUsersForChannel({ parishId, actorUserId, channelId, query: q })
      : await listMentionableUsersForTask({ parishId, actorUserId, taskId: taskId!, query: q });

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to load mentionable users" }, { status: 500 });
  }
}
