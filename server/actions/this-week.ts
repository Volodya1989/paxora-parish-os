import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getWeekForSelection, type WeekSelection } from "@/domain/week";
import { resolveParishContext } from "@/server/auth/parish-context";
import { getWeekDigestSummary } from "@/server/db/digest";
import { prisma } from "@/server/db/prisma";

export type ThisWeekSummary = {
  week: {
    id: string;
    label: string;
    startsOn: Date;
    endsOn: Date;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  }>;
  digestStatus: "none" | "draft" | "published";
};

export async function getThisWeekSummary(
  weekSelection: WeekSelection = "current"
): Promise<ThisWeekSummary> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const { parishId } = await resolveParishContext({
    userId: session.user.id,
    activeParishId: session.user.activeParishId
  });

  if (!parishId) {
    throw new Error("Parish context required");
  }
  const week = await getWeekForSelection(parishId, weekSelection);
  const summary = await getWeekDigestSummary(parishId, week.id);

  if (!summary) {
    throw new Error("Not found");
  }

  const digestStatus =
    summary.digest?.status === "PUBLISHED" ? "published" : summary.digest ? "draft" : "none";

  return {
    week: {
      id: summary.id,
      label: summary.label,
      startsOn: summary.startsOn,
      endsOn: summary.endsOn
    },
    tasks: summary.tasks,
    events: summary.events,
    digestStatus
  };
}
