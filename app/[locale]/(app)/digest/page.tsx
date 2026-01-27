import { getServerSession } from "next-auth";
import SectionTitle from "@/components/ui/SectionTitle";
import { authOptions } from "@/server/auth/options";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { buildDigestContent } from "@/domain/digest";
import { getWeekDigestSummary } from "@/server/db/digest";
import DigestComposer from "./DigestComposer";

function formatDateRange(startsOn: Date, endsOn: Date) {
  const start = startsOn.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  const end = new Date(endsOn.getTime() - 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  return `${start} – ${end}`;
}

export default async function DigestPage() {
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

  const digest = summary.digest;
  const initialContent =
    digest?.content ??
    buildDigestContent({
      tasks: summary.tasks.map((task) => ({
        title: task.title,
        status: task.status === "DONE" ? "DONE" : "OPEN"
      })),
      events: summary.events
    });

  const initialStatus = digest?.status === "PUBLISHED" ? "published" : digest ? "draft" : "none";

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Weekly Digest"
        subtitle={`${summary.label} · ${formatDateRange(summary.startsOn, summary.endsOn)}`}
      />
      <DigestComposer initialContent={initialContent} initialStatus={initialStatus} />
    </div>
  );
}
