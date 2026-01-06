import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { getWeekDigestSummary } from "@/server/db/digest";

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

export async function getThisWeekSummary(): Promise<ThisWeekSummary> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.activeParishId) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  const week = await getOrCreateCurrentWeek(parishId);
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
