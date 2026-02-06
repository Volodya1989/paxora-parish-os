"use client";

import { useState, type KeyboardEvent } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import { cn } from "@/lib/ui/cn";
import { ListChecksIcon } from "@/components/icons/ParishIcons";
import type { TaskListItem } from "@/lib/queries/tasks";
import { useTranslations } from "@/lib/i18n/provider";

type TaskRowProps = {
  task: TaskListItem;
  onStartWork: (taskId: string) => void;
  onMarkDone: (taskId: string) => void;
  onMarkOpen: (taskId: string) => void;
  onAssignToMe: (taskId: string) => void;
  onUnassign: (taskId: string) => void;
  onVolunteer: (taskId: string) => void;
  onLeaveVolunteer: (taskId: string) => void;
  onViewDetails: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: TaskListItem) => void;
  onDelete: (taskId: string) => void;
  currentUserId: string;
  isBusy?: boolean;
};

function formatCompletedLabel(task: TaskListItem) {
  if (!task.completedAt || !task.completedBy) {
    return null;
  }
  const date = new Date(task.completedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
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

function formatDueDateLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

function formatCompactName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length === 1) {
    return trimmed.toUpperCase();
  }
  return `${trimmed[0]}${trimmed[trimmed.length - 1]}`.toUpperCase();
}

export default function TaskRow({
  task,
  onStartWork,
  onMarkDone,
  onMarkOpen,
  onAssignToMe,
  onUnassign,
  onVolunteer,
  onLeaveVolunteer,
  onViewDetails,
  onArchive,
  onEdit,
  onDelete,
  currentUserId,
  isBusy = false
}: TaskRowProps) {
  const t = useTranslations();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isDone = task.status === "DONE";
  const isInProgress = task.status === "IN_PROGRESS";
  const isVolunteerTask = task.volunteersNeeded > 1;
  const canManage = task.canManage && !isBusy;
  const canManageStatus = task.canManageStatus && !isBusy;
  const canOpenMenu = !isBusy;
  const completedLabel = formatCompletedLabel(task);
  const inProgressLabel = task.inProgressAt
    ? `Started ${new Date(task.inProgressAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    })}`
    : null;
  const approvalLabel =
    task.approvalStatus === "PENDING"
      ? "Pending"
      : task.approvalStatus === "REJECTED"
        ? "Rejected"
        : "Approved";
  const approvalTone = task.approvalStatus === "APPROVED" ? "success" : "warning";
  const visibilityLabel = task.visibility === "PUBLIC" ? t("common.public") : t("common.private");
  const isPrivate = task.visibility === "PRIVATE";
  const estimatedHoursLabel = formatEstimatedHours(task);
  const volunteerCountLabel = `${task.volunteerCount}/${task.volunteersNeeded}`;
  const isVolunteerFull = task.volunteerCount >= task.volunteersNeeded;
  const ownerCompactName = task.owner ? formatCompactName(task.owner.name) : null;
  const ownerLabel = task.owner?.name ?? "Unassigned";
  const showAssignToMe = !isPrivate && !isVolunteerTask && !task.owner && task.canAssignToSelf;
  const showApprovalBadge =
    task.visibility === "PUBLIC" &&
    (task.approvalStatus !== "APPROVED" ||
      task.createdByRole === "MEMBER" ||
      task.createdByRole === null);
  const statusActionLabel = isDone ? "Reopen" : isInProgress ? "Complete task" : "Start serving";
  const statusActionHandler = isDone
    ? () => onMarkOpen(task.id)
    : isInProgress
      ? () => onMarkDone(task.id)
      : () => onStartWork(task.id);
  const dueDateLabel = formatDueDateLabel(task.dueAt);
  const handleViewDetails = () => onViewDetails(task.id);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleViewDetails();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border border-mist-100 bg-white px-3 py-3 shadow-card sm:flex-row sm:items-start sm:justify-between",
        isDone
          ? "border-l-4 border-l-emerald-400"
          : isInProgress
            ? "border-l-4 border-l-amber-400"
            : "border-l-4 border-l-sky-400"
      )}
      role="button"
      tabIndex={0}
      onClick={handleViewDetails}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mist-100">
                <ListChecksIcon className="h-3.5 w-3.5 text-ink-400" />
              </span>
              <p className="text-sm font-semibold text-ink-900 break-words">{task.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-mist-200 text-ink-500 transition hover:bg-mist-50 focus-ring"
                onClick={(event) => {
                  event.stopPropagation();
                  setDetailsOpen((prev) => !prev);
                }}
                aria-label={detailsOpen ? "Hide details" : "Show details"}
              >
                <span className={cn("text-lg transition", detailsOpen ? "rotate-180" : "rotate-0")}>
                  ▾
                </span>
              </button>
              <Dropdown>
                <DropdownTrigger
                  iconOnly
                  aria-label="Task actions"
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-mist-200 text-ink-500 transition hover:bg-mist-50 focus-ring",
                    !canOpenMenu && "cursor-not-allowed opacity-50"
                  )}
                  disabled={!canOpenMenu}
                  onClick={(event) => event.stopPropagation()}
                >
                  ⋯
                </DropdownTrigger>
                <DropdownMenu ariaLabel="Task actions">
                  <DropdownItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewDetails(task.id);
                    }}
                  >
                    View details
                  </DropdownItem>
                  {showAssignToMe ? (
                    <DropdownItem
                      onClick={(event) => {
                        event.stopPropagation();
                        onAssignToMe(task.id);
                      }}
                      disabled={isBusy}
                    >
                      Assign to me
                    </DropdownItem>
                  ) : null}
                  {!isVolunteerTask &&
                  task.owner &&
                  (task.owner.id === currentUserId || canManage) ? (
                    <DropdownItem
                      onClick={(event) => {
                        event.stopPropagation();
                        onUnassign(task.id);
                      }}
                      disabled={!canManage}
                      className={cn(!canManage && "pointer-events-none opacity-50")}
                    >
                      Unassign
                    </DropdownItem>
                  ) : null}
                  <DropdownItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(task);
                    }}
                    disabled={!canManage}
                    className={cn(!canManage && "pointer-events-none opacity-50")}
                  >
                    {t("buttons.edit")}
                  </DropdownItem>
                  <DropdownItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onArchive(task.id);
                    }}
                    disabled={!canManage}
                    className={cn(!canManage && "pointer-events-none opacity-50 text-ink-300")}
                  >
                    Archive task
                  </DropdownItem>
                  {task.canDelete ? (
                    <DropdownItem
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(task.id);
                      }}
                      disabled={!task.canDelete}
                      className={cn(
                        "text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50",
                        !task.canDelete && "pointer-events-none opacity-50"
                      )}
                    >
                      {t("buttons.delete")}
                    </DropdownItem>
                  ) : null}
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
          {detailsOpen && task.notes ? (
            <p className="text-xs text-ink-500 break-words">{task.notes}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <Badge tone={isDone ? "success" : isInProgress ? "warning" : "neutral"}>
              {isDone ? t("common.done") : isInProgress ? t("common.inProgress") : t("common.todo")}
            </Badge>
            <span className="rounded-full bg-mist-50 px-2 py-1 text-[11px] font-medium text-ink-600">
              Due {dueDateLabel}
            </span>
          </div>
          {detailsOpen ? (
            <div className="space-y-2 rounded-card border border-mist-100 bg-mist-50/70 px-3 py-2 text-xs text-ink-600">
              <div className="flex flex-wrap items-center gap-2">
                {showApprovalBadge ? (
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
                {isVolunteerTask ? (
                  <Badge tone="success" className="bg-emerald-50 text-emerald-700">
                    {volunteerCountLabel} volunteers
                  </Badge>
                ) : null}
                {estimatedHoursLabel ? (
                  <Badge tone="neutral" className="bg-amber-50 text-amber-700">
                    {estimatedHoursLabel}
                  </Badge>
                ) : null}
                {task.group ? (
                  <Badge tone="warning" className="bg-indigo-50 text-indigo-700">
                    {task.group.name}
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-100 text-[11px] font-semibold text-ink-700">
                    {ownerCompactName ?? "—"}
                  </span>
                  <span className="text-xs text-ink-600">{ownerLabel}</span>
                </span>
                {completedLabel ? (
                  <span className="text-xs text-emerald-600">{completedLabel}</span>
                ) : null}
                {inProgressLabel && !isDone && task.owner ? (
                  <span className="text-xs text-amber-600" title={task.owner.name}>
                    {inProgressLabel} by {ownerCompactName}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isVolunteerTask && (task.canVolunteer || task.hasVolunteered) ? (
            <Button
              type="button"
              variant={task.hasVolunteered ? "secondary" : "primary"}
              onClick={(event) => {
                event.stopPropagation();
                if (task.hasVolunteered) {
                  onLeaveVolunteer(task.id);
                  return;
                }
                onVolunteer(task.id);
              }}
              disabled={
                isBusy ||
                (!task.hasVolunteered && (isVolunteerFull || !task.canVolunteer))
              }
            >
              {task.hasVolunteered
                ? "Leave"
                : isVolunteerFull
                  ? "Full"
                  : task.canVolunteer
                    ? "Volunteer"
                    : "Closed"}
            </Button>
          ) : null}

          {canManageStatus ? (
            <Button
              type="button"
              variant={isDone ? "secondary" : "primary"}
              onClick={(event) => {
                event.stopPropagation();
                statusActionHandler();
              }}
              disabled={isBusy}
              className={
                isInProgress
                  ? "bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:bg-sky-300"
                  : undefined
              }
            >
              {statusActionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
