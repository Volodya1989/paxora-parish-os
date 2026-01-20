import Link from "next/link";
import { ClockIcon, HandHeartIcon } from "@/components/icons/ParishIcons";
import ParishionerSectionCard from "@/components/this-week/parishioner/ParishionerSectionCard";
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
  return (
    <section id="opportunities" className="scroll-mt-24">
      <ParishionerSectionCard
        title="Opportunities to Help"
        icon={<HandHeartIcon className="h-5 w-5" />}
        borderClass="border-rose-200"
        iconClass="bg-rose-100 text-rose-700"
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
          {tasks.length === 0 ? (
            <div className="rounded-card border border-rose-100 bg-rose-50/40 px-4 py-3 text-sm text-ink-500">
              No opportunities right now. {" "}
              <Link className="font-medium text-ink-700 underline" href="/groups">
                Browse groups
              </Link>
              .
            </div>
          ) : (
            tasks.slice(0, 3).map((task) => (
              <Link
                key={task.id}
                href={`/tasks?view=opportunities&taskId=${task.id}`}
                className="block rounded-card border border-mist-100 bg-white px-4 py-3 transition hover:border-rose-200 hover:bg-rose-50/30"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
                  <ClockIcon className="h-3.5 w-3.5" />
                  <span>Due by {task.dueBy ? formatDueLabel(task.dueBy) : "TBD"}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink-900">{task.title}</p>
              </Link>
            ))
          )}
        </div>
      </ParishionerSectionCard>
    </section>
  );
}
