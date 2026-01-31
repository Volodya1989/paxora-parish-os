import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { deleteParishHubItem, updateParishHubItem } from "@/server/actions/parish-hub";

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
  ctx: { params: Promise<{ parishId: string; itemId: string }> }
) {
  const { parishId, itemId } = await ctx.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await updateParishHubItem({
      parishId,
      actorUserId: session.user.id,
      itemId,
      label: body.label as string,
      icon: body.icon as
        | "BULLETIN"
        | "MASS_TIMES"
        | "CONFESSION"
        | "WEBSITE"
        | "CALENDAR"
        | "READINGS"
        | "GIVING"
        | "CONTACT",
      targetType: body.targetType as "EXTERNAL" | "INTERNAL",
      targetUrl: body.targetUrl as string | null | undefined,
      internalRoute: body.internalRoute as string | null | undefined,
      visibility: body.visibility as "PUBLIC" | "LOGGED_IN",
      order: body.order as number | undefined,
      enabled: body.enabled as boolean | undefined
    });

    return NextResponse.json({ item });
  } catch (error) {
    const status = getErrorStatus(error);
    const message = error instanceof Error ? error.message : "Invalid input";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ parishId: string; itemId: string }> }
) {
  const { parishId, itemId } = await ctx.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteParishHubItem({
      parishId,
      actorUserId: session.user.id,
      itemId
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = getErrorStatus(error);
    const message = error instanceof Error ? error.message : "Invalid input";
    return NextResponse.json({ error: message }, { status });
  }
}
