"use client";

import Badge from "@/components/ui/Badge";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import { cn } from "@/lib/ui/cn";
import type { TaskListItem } from "@/lib/queries/tasks";

type TaskRowProps = {
  task: TaskListItem;
  onToggle: (taskId: string, nextStatus: "OPEN" | "DONE") => void;
  onArchive: (taskId: string) => void;
  isBusy?: boolean;
};

export default function TaskRow({ task, onToggle, onArchive, isBusy = false }: TaskRowProps) {
  const isDone = task.status === "DONE";
  const nextStatus = isDone ? "OPEN" : "DONE";
  const isDisabled = !task.canManage || isBusy;

  return (
    <div className="flex flex-col gap-4 rounded-card border border-mist-100 bg-white px-4 py-4 shadow-card sm:flex-row sm:items-start sm:justify-between">
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
            onClick={() => onArchive(task.id)}
            disabled={isDisabled}
            className={cn(isDisabled && "pointer-events-none opacity-50 text-ink-300")}
          >
            Archive task
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
