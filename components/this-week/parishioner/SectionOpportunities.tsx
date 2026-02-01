import Link from "next/link";
import { ClockIcon, HandHeartIcon } from "@/components/icons/ParishIcons";
import Badge from "@/components/ui/Badge";
import AccentSectionCard from "@/components/layout/AccentSectionCard";
import { routes } from "@/lib/navigation/routes";
import type { TaskPreview } from "@/lib/queries/this-week";
import { formatShortDate, formatTime } from "@/lib/this-week/formatters";

type SectionOpportunitiesProps = {
  tasks: TaskPreview[];
};

function formatDueLabel(dueBy: Date) {
  const hasTime = dueBy.getHours() !== 0 || dueBy.getMinutes() !== 0;
  return hasTime ? `${formatShortDate(dueBy)} · ${formatTime(dueBy)}` : formatShortDate(dueBy);
}

/**
 * Section displaying open volunteer opportunities and tasks.
 *
 * Shows the top 3 open tasks/opportunities with due dates.
 * Uses a rose/action accent color to encourage participation.
 * Includes status breakdown badges (Open, In Progress, Done) for quick overview.
 * Includes a "View all" link to the full serve board/opportunities page.
 *
 * **Empty State:** Shows when no opportunities are currently available.
 * Encourages visiting the full serve board to stay updated.
 *
 * **Color System:** Rose accent (action/help tone)
 *
 * @param props - Component props
 * @param props.tasks - Array of open task previews to display (up to 3 shown)
 * @returns Rendered opportunities section with scroll anchor
 *
 * @example
 * <SectionOpportunities tasks={openTasks} />
 */
export default function SectionOpportunities({ tasks }: SectionOpportunitiesProps) {
  // Calculate task status breakdown
  const openCount = tasks.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  return (
    <section id="opportunities" className="scroll-mt-24">
      <AccentSectionCard
        title="Opportunities to Help"
        icon={<HandHeartIcon className="h-5 w-5" />}
        borderClass="border-rose-200"
        iconClass="bg-rose-100 text-rose-700"
        action={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Status badges */}
            <div className="flex flex-wrap gap-1.5">
              {openCount > 0 && (
                <Badge tone="neutral">
                  {openCount} Open
                </Badge>
              )}
              {inProgressCount > 0 && (
                <Badge tone="warning">
                  {inProgressCount} In Progress
                </Badge>
              )}
              {doneCount > 0 && (
                <Badge tone="success">
                  {doneCount} Done
                </Badge>
              )}
            </div>
            {/* View all link */}
            <Link
              className="whitespace-nowrap text-sm font-medium text-ink-700 underline"
              href={`${routes.serve}?view=opportunities`}
            >
              View all
            </Link>
          </div>
        }
      >
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-card border border-rose-100 bg-rose-50/40 px-4 py-3 text-sm text-ink-500">
              No opportunities right now. {" "}
              <Link className="font-medium text-ink-700 underline" href={routes.serve}>
                Browse opportunities to serve
              </Link>
              .
            </div>
          ) : (
            tasks.slice(0, 3).map((task) => (
              <Link
                key={task.id}
                href={`${routes.serve}?view=opportunities&taskId=${task.id}`}
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
      </AccentSectionCard>
    </section>
  );
}
