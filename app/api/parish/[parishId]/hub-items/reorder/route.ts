import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { reorderParishHubItems } from "@/server/actions/parish-hub";

function getErrorStatus(error: unknown) {
  if (!(error instanceof Error)) {
    return 400;
  }

  if (error.message === "Unauthorized") {
    return 401;
  }

  if (error.message === "Forbidden") {
    return 403;
  }

  if (error.message === "Parish hub item not found.") {
    return 404;
  }

  return 400;
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ parishId: string }> }
) {
  const { parishId } = await ctx.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { items?: Array<{ itemId: string; order: number }> };
    await reorderParishHubItems({
      parishId,
      actorUserId: session.user.id,
      items: body.items ?? []
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = getErrorStatus(error);
    const message = error instanceof Error ? error.message : "Invalid input";
    return NextResponse.json({ error: message }, { status });
  }
}
