import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { updateParishHubSettings } from "@/server/actions/parish-hub";

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
    const body = (await request.json()) as {
      hubGridEnabled?: boolean;
      hubGridPublicEnabled?: boolean;
    };
    const settings = await updateParishHubSettings({
      parishId,
      actorUserId: session.user.id,
      hubGridEnabled: body.hubGridEnabled,
      hubGridPublicEnabled: body.hubGridPublicEnabled
    });

    return NextResponse.json({ settings });
  } catch (error) {
    const status = getErrorStatus(error);
    const message = error instanceof Error ? error.message : "Invalid input";
    return NextResponse.json({ error: message }, { status });
  }
}
