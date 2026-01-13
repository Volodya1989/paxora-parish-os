"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import TaskCreateDialog from "@/components/tasks/TaskCreateDialog";
import TaskFilters from "@/components/tasks/TaskFilters";
import TasksEmptyState from "@/components/tasks/TasksEmptyState";
import TasksList from "@/components/tasks/TasksList";
import type { TaskFilters as TaskFiltersState, TaskListItem, TaskListSummary } from "@/lib/queries/tasks";

type TasksViewProps = {
  weekLabel: string;
  weekRange: string;
  weekId: string;
  tasks: TaskListItem[];
  summary: TaskListSummary;
  filteredCount: number;
  filters: TaskFiltersState;
  groupOptions: Array<{ id: string; name: string }>;
  memberOptions: Array<{ id: string; name: string }>;
  currentUserId: string;
};

export default function TasksView({
  weekLabel,
  weekRange,
  weekId,
  tasks,
  summary,
  filteredCount,
  filters,
  groupOptions,
  memberOptions,
  currentUserId
}: TasksViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createParam = searchParams?.get("create");
  const hasTasks = summary.total > 0;
  const hasMatches = filteredCount > 0;

  useEffect(() => {
    if (createParam === "task") {
      setIsCreateOpen(true);
    }
  }, [createParam]);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("status");
    params.delete("owner");
    params.delete("group");
    params.delete("q");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const closeCreateDialog = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (params.has("create")) {
      params.delete("create");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
    setIsCreateOpen(false);
  };

  const statsLabel = useMemo(() => {
    return `${summary.open} open · ${summary.done} done`;
  }, [summary.done, summary.open]);

  return (
    <div className="section-gap">
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h1">Tasks</h1>
              <span className="rounded-full bg-mist-100 px-3 py-1 text-xs font-medium text-ink-700">
                Week {weekLabel}
              </span>
            </div>
            <p className="text-sm text-ink-500">
              Track what must happen this week. {weekRange}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-card border border-mist-200 bg-mist-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-ink-400">Progress</p>
              <p className="text-sm font-semibold text-ink-700">{statsLabel}</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>New Task</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-h3">Filters</h2>
            <p className="text-xs text-ink-400">
              Narrow the list to the tasks you need to focus on.
            </p>
          </div>
          <TaskFilters filters={filters} groupOptions={groupOptions} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-h3">Task list</h2>
            <p className="text-xs text-ink-400">{filteredCount} tasks shown</p>
          </div>
          {hasTasks ? (
            <p className="text-xs text-ink-400">Total this week: {summary.total}</p>
          ) : null}
        </div>

        <div className="mt-4">
          {/* Grouped sections reinforce status context while keeping filters and empty states visible. */}
          {!hasTasks ? (
            <TasksEmptyState variant="no-tasks" onCreate={() => setIsCreateOpen(true)} />
          ) : !hasMatches ? (
            <TasksEmptyState variant="no-matches" onClearFilters={clearFilters} />
          ) : (
            <TasksList tasks={tasks} />
          )}
        </div>
      </Card>

      <TaskCreateDialog
        open={isCreateOpen}
        onOpenChange={(open) => (open ? setIsCreateOpen(true) : closeCreateDialog())}
        weekId={weekId}
        groupOptions={groupOptions}
        memberOptions={memberOptions}
        currentUserId={currentUserId}
      />
    </div>
  );
}
