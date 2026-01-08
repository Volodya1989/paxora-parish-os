import Link from "next/link";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import Badge from "@/components/ui/Badge";
import ListRow from "@/components/ui/ListRow";
import { getThisWeekSummary } from "@/server/actions/this-week";
import { parseWeekSelection } from "@/domain/week";

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

export default async function ThisWeekPage({
  searchParams
}: {
  searchParams?: { week?: string | string[] };
}) {
  const weekSelection = parseWeekSelection(searchParams?.week);
  const summary = await getThisWeekSummary(weekSelection);
  const digestTone =
    summary.digestStatus === "published"
      ? "success"
      : summary.digestStatus === "draft"
        ? "warning"
        : "neutral";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          title="This Week"
          subtitle={`${summary.week.label} · ${formatDateRange(summary.week.startsOn, summary.week.endsOn)}`}
        />
        <Link className="text-sm font-medium text-ink-900 underline" href="/tasks">
          View tasks
        </Link>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Weekly digest</h2>
            <p className="text-sm text-ink-500">Share a recap of tasks and events.</p>
          </div>
          <Badge tone={digestTone}>{summary.digestStatus === "none" ? "No digest" : summary.digestStatus}</Badge>
        </div>
        <div className="mt-4">
          <Link className="text-sm font-medium text-ink-900 underline" href="/digest">
            Open digest workspace
          </Link>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Tasks</h2>
        </div>
        <div className="mt-4">
          {summary.tasks.length === 0 ? (
            <p className="text-sm text-ink-500">No tasks yet for this week.</p>
          ) : (
            summary.tasks.map((task) => (
              <ListRow key={task.id} title={task.title} meta={task.status === "DONE" ? "Completed" : "Open"} />
            ))
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Events</h2>
        <div className="mt-4">
          {summary.events.length === 0 ? (
            <p className="text-sm text-ink-500">No events listed for this week.</p>
          ) : (
            summary.events.map((event) => (
              <ListRow
                key={event.id}
                title={event.title}
                meta={`${event.startsAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric"
                })} · ${event.location ?? "Location TBA"}`}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
