"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import { cn } from "@/lib/ui/cn";
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
  const showAssignToMe = !isPrivate && !isVolunteerTask && !task.owner && task.canAssignToSelf;
  const showUnassignSelf =
    !isPrivate && !isVolunteerTask && task.owner?.id === currentUserId && task.canManage;
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

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-card border border-mist-100 bg-white px-4 py-4 shadow-card sm:flex-row sm:items-start sm:justify-between",
        isDone
          ? "border-l-4 border-l-emerald-400"
          : isInProgress
            ? "border-l-4 border-l-amber-400"
            : "border-l-4 border-l-sky-400"
      )}
    >
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-ink-900">{task.title}</p>
            {task.notes ? (
              <p className="mt-1 text-sm text-ink-500">{task.notes}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <Badge tone={isDone ? "success" : isInProgress ? "warning" : "neutral"}>
              {isDone ? t("common.done") : isInProgress ? t("common.inProgress") : t("common.todo")}
            </Badge>
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
                {volunteerCountLabel}
              </Badge>
            ) : null}
            {!isPrivate ? (
              task.owner ? (
                <span className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-100 text-[11px] font-semibold text-ink-700"
                    title={task.owner.name}
                  >
                    {ownerCompactName}
                  </span>
                  {showUnassignSelf ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onUnassign(task.id)}
                      disabled={isBusy}
                    >
                      Unassign
                    </Button>
                  ) : null}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Badge tone="neutral" className="bg-mist-50 text-ink-500">
                    Unassigned
                  </Badge>
                  {showAssignToMe ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onAssignToMe(task.id)}
                      disabled={isBusy}
                    >
                      Assign to me
                    </Button>
                  ) : null}
                </span>
              )
            ) : null}

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
            <Badge tone="neutral" className="bg-mist-50 text-ink-600">
              Due {dueDateLabel}
            </Badge>
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

        <div className="flex flex-wrap items-center gap-2">
          {isVolunteerTask && (task.canVolunteer || task.hasVolunteered) ? (
            <Button
              type="button"
              variant={task.hasVolunteered ? "secondary" : "primary"}
              onClick={() =>
                task.hasVolunteered ? onLeaveVolunteer(task.id) : onVolunteer(task.id)
              }
              disabled={
                isBusy ||
                (!task.hasVolunteered &&
                  (isVolunteerFull || !task.canVolunteer))
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
            <Button type="button" onClick={statusActionHandler} disabled={isBusy}>
              {statusActionLabel}
            </Button>
          ) : null}

          <Dropdown>
            <DropdownTrigger
              iconOnly
              aria-label="Task actions"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-button border border-mist-200 text-ink-500 transition hover:bg-mist-50 focus-ring",
                !canOpenMenu && "cursor-not-allowed opacity-50"
              )}
              disabled={!canOpenMenu}
            >
              ⋯
            </DropdownTrigger>
            <DropdownMenu ariaLabel="Task actions">
              <DropdownItem onClick={() => onViewDetails(task.id)}>
                View details
              </DropdownItem>
              {!isVolunteerTask && task.owner && (task.owner.id === currentUserId || canManage) ? (
                <DropdownItem
                  onClick={() => onUnassign(task.id)}
                  disabled={!canManage}
                  className={cn(!canManage && "pointer-events-none opacity-50")}
                >
                  Unassign
                </DropdownItem>
              ) : null}
              <DropdownItem
                onClick={() => onEdit(task)}
                disabled={!canManage}
                className={cn(!canManage && "pointer-events-none opacity-50")}
              >
                {t("buttons.edit")}
              </DropdownItem>
              <DropdownItem
                onClick={() => onArchive(task.id)}
                disabled={!canManage}
                className={cn(!canManage && "pointer-events-none opacity-50 text-ink-300")}
              >
                Archive task
              </DropdownItem>
              {task.canDelete ? (
                <DropdownItem
                  onClick={() => onDelete(task.id)}
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
    </div>
  );
}
