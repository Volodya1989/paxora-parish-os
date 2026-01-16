import React, { type ReactNode } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import ThisWeekHeader from "@/components/this-week/ThisWeekHeader";
import SectionCard from "@/components/this-week/SectionCard";
import EmptyStateBlock from "@/components/this-week/EmptyStateBlock";
import { getThisWeekData } from "@/lib/queries/this-week";
import { getWeekLabel, parseWeekSelection } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";

function IconCircle({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mist-100 text-ink-400">
      {children}
    </div>
  );
}

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

function formatUpdatedLabel(now: Date) {
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  });
  return `Updated ${time}`;
}

function formatEventTime(event: { startsAt: Date }) {
  const date = event.startsAt.toLocaleDateString("en-US", {
    weekday: "short"
  });
  const time = event.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${date} ${time}`;
}

function formatUpdatedTime(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function buildWeekOptions(weekStart: Date) {
  const previousStart = new Date(weekStart);
  previousStart.setDate(previousStart.getDate() - 7);
  const nextStart = new Date(weekStart);
  nextStart.setDate(nextStart.getDate() + 7);

  return [
    {
      value: "previous" as const,
      label: getWeekLabel(previousStart),
      range: formatDateRange(previousStart, new Date(previousStart.getTime() + 7 * 24 * 60 * 60 * 1000))
    },
    {
      value: "current" as const,
      label: getWeekLabel(weekStart),
      range: formatDateRange(weekStart, new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))
    },
    {
      value: "next" as const,
      label: getWeekLabel(nextStart),
      range: formatDateRange(nextStart, new Date(nextStart.getTime() + 7 * 24 * 60 * 60 * 1000))
    }
  ];
}

export default async function ThisWeekPage({
  searchParams
}: {
  searchParams?: Promise<{ week?: string | string[] } | undefined>;
}) {
  const resolvedSearchParams = await searchParams;
  const weekSelection = parseWeekSelection(resolvedSearchParams?.week);
  const now = getNow();
  const data = await getThisWeekData({ weekSelection, now });
  const weekOptions = buildWeekOptions(data.week.startsOn);

  return (
    <div className="section-gap">
      <ThisWeekHeader
        title="This Week"
        weekLabel={data.week.label}
        dateRange={formatDateRange(data.week.startsOn, data.week.endsOn)}
        updatedLabel={formatUpdatedLabel(now)}
        completionLabel={`${data.stats.tasksDone}/${data.stats.tasksTotal} done`}
        completionPct={data.stats.completionPct}
        weekSelection={weekSelection}
        weekOptions={weekOptions}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Tasks"
          meta={`${data.tasks.length} active`}
          action={
            <Link className="text-sm font-medium text-ink-700 underline" href="/tasks">
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {data.tasks.length === 0 ? (
              <EmptyStateBlock
                icon={
                  <IconCircle>
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 12.5l2.5 2.5 6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="16"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </IconCircle>
                }
                title="No tasks for this week"
                description="Capture what needs to happen and keep your parish teams aligned."
                action={
                  <Link href="/tasks?create=task">
                    <Button size="sm">Add a task</Button>
                  </Link>
                }
              />
            ) : (
              data.tasks.slice(0, 5).map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks?taskId=${task.id}`}
                  className="flex items-center justify-between gap-3 rounded-card border border-mist-100 bg-white px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/30"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-ink-900">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <Badge tone={task.status === "DONE" ? "success" : "neutral"}>
                        {task.status === "DONE" ? "Done" : "Open"}
                      </Badge>
                      <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-100 text-[11px] font-semibold text-ink-700">
                          {task.owner.initials}
                        </span>
                        <span>{task.owner.name}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Events"
          meta={`${data.events.length} scheduled`}
          action={
            <Link className="text-sm font-medium text-ink-700 underline" href="/calendar">
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {data.events.length === 0 ? (
              <EmptyStateBlock
                icon={
                  <IconCircle>
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="4"
                        y="5"
                        width="16"
                        height="15"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M8 3v4M16 3v4M4 10h16"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </IconCircle>
                }
                title="No events scheduled this week"
                description="Plan services, rehearsals, and gatherings so everyone stays in sync."
                action={
                  <Button size="sm" disabled>
                    Add event (coming soon)
                  </Button>
                }
              />
            ) : (
              data.events.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-card border border-mist-100 bg-white px-4 py-3"
                >
                  <div className="space-y-2">
                    <span className="inline-flex items-center rounded-full bg-mist-100 px-3 py-1 text-xs font-medium text-ink-700">
                      {formatEventTime(event)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-900">{event.title}</p>
                      <p className="text-xs text-ink-500">{event.location ?? "Location TBA"}</p>
                    </div>
                  </div>
                  <Dropdown>
                    <DropdownTrigger
                      iconOnly
                      aria-label={`More options for ${event.title}`}
                      className="rounded-button border border-mist-200 px-2 py-1 text-sm text-ink-500 hover:bg-mist-50"
                    >
                      ⋯
                    </DropdownTrigger>
                    <DropdownMenu ariaLabel={`Event actions for ${event.title}`}>
                      <DropdownItem asChild>
                        <Link href={`/calendar/events/${event.id}/edit`}>Edit</Link>
                      </DropdownItem>
                      <DropdownItem asChild>
                        <Link href={`/calendar/events/${event.id}/delete`}>Delete</Link>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Announcements"
          meta={`${data.announcements.length} drafts this week`}
          action={
            <Link className="text-sm font-medium text-ink-700 underline" href="/announcements">
              View all
            </Link>
          }
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            {data.announcements.length === 0 ? (
              <EmptyStateBlock
                icon={
                  <IconCircle>
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 12h4l8-4v8l-8-4H4z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 16.5l1.5 3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </IconCircle>
                }
                title="Share a parish update"
                description="Draft announcements to keep parishioners informed and in the loop."
                action={
                  <Link href="/announcements/new">
                    <Button size="sm">Create announcement</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {data.announcements.slice(0, 3).map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex items-center justify-between gap-3 rounded-card border border-mist-100 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-900">{announcement.title}</p>
                      <p className="text-xs text-ink-500">
                        Updated {formatUpdatedTime(announcement.updatedAt)}
                      </p>
                    </div>
                    <Badge tone={announcement.status === "Published" ? "success" : "warning"}>
                      {announcement.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
