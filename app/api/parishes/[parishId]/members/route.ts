import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { getPeopleListForAdmin } from "@/lib/queries/people";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ parishId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parishId } = await ctx.params;
  if (parishId !== session.user.activeParishId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await requireAdminOrShepherd(session.user.id, parishId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query");

  const members = await getPeopleListForAdmin(session.user.id, parishId, query);

  return NextResponse.json({ members });
}
