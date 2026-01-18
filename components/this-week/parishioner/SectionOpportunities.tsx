import Link from "next/link";
import SectionCard from "@/components/this-week/SectionCard";
import type { TaskPreview } from "@/lib/queries/this-week";
import { formatShortDate, formatTime } from "@/lib/this-week/formatters";

type SectionOpportunitiesProps = {
  tasks: TaskPreview[];
};

function formatDueLabel(dueBy: Date) {
  const hasTime = dueBy.getHours() !== 0 || dueBy.getMinutes() !== 0;
  return hasTime ? `${formatShortDate(dueBy)} · ${formatTime(dueBy)}` : formatShortDate(dueBy);
}

export default function SectionOpportunities({ tasks }: SectionOpportunitiesProps) {
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.dueBy && b.dueBy) {
      return a.dueBy.getTime() - b.dueBy.getTime();
    }
    if (a.dueBy) return -1;
    if (b.dueBy) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <section id="opportunities" className="scroll-mt-24">
      <SectionCard
        title="Opportunities to Help"
        action={
          <Link
            className="whitespace-nowrap text-sm font-medium text-ink-700 underline"
            href="/tasks?view=opportunities"
          >
            View all
          </Link>
        }
      >
        <div className="space-y-3">
          {sortedTasks.length === 0 ? (
            <div className="rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-sm text-ink-500">
              No opportunities right now.{" "}
              <Link className="font-medium text-ink-700 underline" href="/groups">
                Browse groups
              </Link>
              .
            </div>
          ) : (
            sortedTasks.slice(0, 3).map((task) => (
              <Link
                key={task.id}
                href={`/tasks?view=opportunities&taskId=${task.id}`}
                className="block rounded-card border border-mist-100 bg-white px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/30"
              >
                <p className="text-xs font-semibold uppercase text-ink-400">
                  Due by {task.dueBy ? formatDueLabel(task.dueBy) : "TBD"}
                </p>
                <p className="mt-2 text-sm font-semibold text-ink-900">{task.title}</p>
              </Link>
            ))
          )}
        </div>
      </SectionCard>
    </section>
  );
}
