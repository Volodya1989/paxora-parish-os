"use client";

import Badge from "@/components/ui/Badge";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import { cn } from "@/lib/ui/cn";
import type { TaskListItem } from "@/lib/queries/tasks";

type TaskRowProps = {
  task: TaskListItem;
  onToggle: (taskId: string, nextStatus: "OPEN" | "DONE") => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: TaskListItem) => void;
  onDelete: (taskId: string) => void;
  isBusy?: boolean;
};

function formatCompletedLabel(task: TaskListItem) {
  if (!task.completedAt || !task.completedBy) {
    return null;
  }
  const date = new Date(task.completedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  return `Completed ${date} by ${task.completedBy.name}`;
}

function formatEstimatedHours(task: TaskListItem) {
  if (task.estimatedHours === null || task.estimatedHours === undefined) {
    return null;
  }
  const hours = Number.isInteger(task.estimatedHours)
    ? task.estimatedHours.toString()
    : task.estimatedHours.toFixed(2).replace(/\.?0+$/, "");
  return `Est. ${hours} hr${hours === "1" ? "" : "s"}`;
}

export default function TaskRow({
  task,
  onToggle,
  onArchive,
  onEdit,
  onDelete,
  isBusy = false
}: TaskRowProps) {
  const isDone = task.status === "DONE";
  const nextStatus = isDone ? "OPEN" : "DONE";
  const isDisabled = !task.canManage || isBusy;
  const completedLabel = formatCompletedLabel(task);
  const approvalLabel =
    task.approvalStatus === "PENDING"
      ? "Pending"
      : task.approvalStatus === "REJECTED"
        ? "Rejected"
        : "Approved";
  const approvalTone = task.approvalStatus === "APPROVED" ? "success" : "warning";
  const visibilityLabel = task.visibility === "PUBLIC" ? "Public" : "Private";
  const estimatedHoursLabel = formatEstimatedHours(task);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-card border border-mist-100 bg-white px-4 py-4 shadow-card sm:flex-row sm:items-start sm:justify-between",
        isDone ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-sky-400"
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-mist-200 text-primary-700 focus-ring"
          checked={isDone}
          onChange={() => onToggle(task.id, nextStatus)}
          disabled={isDisabled}
          aria-label={isDone ? "Mark task as open" : "Mark task as done"}
        />
        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-ink-900">{task.title}</p>
            {task.notes ? (
              <p className="mt-1 text-sm text-ink-500">{task.notes}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <Badge tone={isDone ? "success" : "neutral"}>
              {isDone ? "Done" : "Open"}
            </Badge>
            {task.visibility === "PUBLIC" ? (
              <Badge
                tone={approvalTone}
                className={
                  task.approvalStatus === "REJECTED"
                    ? "bg-rose-50 text-rose-700"
                    : undefined
                }
              >
                {approvalLabel}
              </Badge>
            ) : null}
            <Badge
              tone="neutral"
              className={
                task.visibility === "PUBLIC"
                  ? "bg-sky-50 text-sky-700"
                  : "bg-slate-100 text-slate-700"
              }
            >
              {visibilityLabel}
            </Badge>
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-100 text-[11px] font-semibold text-ink-700">
                {task.owner.initials}
              </span>
              <span>{task.owner.name}</span>
            </span>
            {task.group ? (
              <Badge tone="warning" className="bg-indigo-50 text-indigo-700">
                {task.group.name}
              </Badge>
            ) : null}
            {estimatedHoursLabel ? (
              <Badge tone="neutral" className="bg-amber-50 text-amber-700">
                {estimatedHoursLabel}
              </Badge>
            ) : null}
            {completedLabel ? (
              <span className="text-xs text-emerald-600">{completedLabel}</span>
            ) : null}
          </div>
        </div>
      </div>

      <Dropdown>
        <DropdownTrigger
          iconOnly
          aria-label="Task actions"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-button border border-mist-200 text-ink-500 transition hover:bg-mist-50 focus-ring",
            isDisabled && "cursor-not-allowed opacity-50"
          )}
          disabled={isDisabled}
        >
          ⋯
        </DropdownTrigger>
        <DropdownMenu ariaLabel="Task actions">
          <DropdownItem
            onClick={() => onToggle(task.id, nextStatus)}
            disabled={isDisabled}
            className={cn(isDisabled && "pointer-events-none opacity-50")}
          >
            {isDone ? "Mark open" : "Mark done"}
          </DropdownItem>
          <DropdownItem
            onClick={() => onEdit(task)}
            disabled={isDisabled}
            className={cn(isDisabled && "pointer-events-none opacity-50")}
          >
            Edit task
          </DropdownItem>
          <DropdownItem
            onClick={() => onArchive(task.id)}
            disabled={isDisabled}
            className={cn(isDisabled && "pointer-events-none opacity-50 text-ink-300")}
          >
            Archive task
          </DropdownItem>
          {task.canDelete ? (
            <DropdownItem
              onClick={() => onDelete(task.id)}
              disabled={isDisabled}
              className={cn(
                "text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50",
                isDisabled && "pointer-events-none opacity-50"
              )}
            >
              Delete task
            </DropdownItem>
          ) : null}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
