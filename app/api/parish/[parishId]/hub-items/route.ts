import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import {
  createParishHubItem,
  listParishHubItemsForMember,
  listParishHubItemsForPublic
} from "@/server/actions/parish-hub";
import { listParishHubItems } from "@/server/db/parish-hub";
import { getParishMembership } from "@/server/db/groups";
import { prisma } from "@/server/db/prisma";

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

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ parishId: string }> }
) {
  const { parishId } = await ctx.params;
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    const userId = session.user.id;
    const membership = await getParishMembership(parishId, userId);

    if (membership) {
      if (session.user.activeParishId === parishId) {
        const items = await listParishHubItemsForMember();
        return NextResponse.json({ items });
      }

      const parish = await prisma.parish.findUnique({
        where: { id: parishId },
        select: { hubGridEnabled: true }
      });

      if (!parish?.hubGridEnabled) {
        return NextResponse.json({ items: [] });
      }

      const items = await listParishHubItems({
        parishId,
        visibility: "LOGGED_IN"
      });

      return NextResponse.json({ items });
    }
  }

  const items = await listParishHubItemsForPublic(parishId);
  return NextResponse.json({ items });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ parishId: string }> }
) {
  const { parishId } = await ctx.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await createParishHubItem({
      parishId,
      actorUserId: session.user.id,
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
