"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "@/lib/i18n/provider";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import SelectMenu from "@/components/ui/SelectMenu";
import Card from "@/components/ui/Card";
import TaskDetailDialog from "@/components/tasks/TaskDetailDialog";
import TaskCompletionDialog from "@/components/tasks/TaskCompletionDialog";
import ParishionerRequestButton from "@/components/requests/ParishionerRequestButton";
import ListEmptyState from "@/components/app/list-empty-state";
import { HeartIcon, ListChecksIcon } from "@/components/icons/ParishIcons";
import { useToast } from "@/components/ui/Toast";
import QuoteCard from "@/components/app/QuoteCard";
import {
  claimTask,
  deleteTask,
  leaveTaskVolunteer,
  unclaimTask,
  updateCoordinator,
  updateOpenToVolunteers,
  updateTaskStatus,
  volunteerForTask
} from "@/server/actions/serve-board";
import type { TaskListItem } from "@/lib/queries/tasks";
import { cn } from "@/lib/ui/cn";

const statusColumns = [
  { id: "OPEN", labelKey: "serve.status.helpNeeded", tone: "bg-sky-50 text-sky-700" },
  { id: "IN_PROGRESS", labelKey: "serve.status.inProgress", tone: "bg-amber-50 text-amber-700" },
  { id: "DONE", labelKey: "serve.status.completed", tone: "bg-emerald-50 text-emerald-700" }
] as const;

type TaskStatus = (typeof statusColumns)[number]["id"];

type ServeBoardViewProps = {
  tasks: TaskListItem[];
  memberOptions: Array<{ id: string; name: string; label?: string }>;
  currentUserId: string;
  isLeader: boolean;
  canRequestOpportunity: boolean;
  requesterEmail: string;
};

function formatDueDate(value: string, locale: string) {
  const date = new Date(value);
  return date.toLocaleDateString(locale, {
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

export default function ServeBoardView({
  tasks,
  memberOptions,
  currentUserId,
  isLeader,
  canRequestOpportunity,
  requesterEmail
}: ServeBoardViewProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<"all" | "mine">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [taskOrderByStatus, setTaskOrderByStatus] = useState<Record<TaskStatus, string[]>>({
    OPEN: [],
    IN_PROGRESS: [],
    DONE: []
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [completeTaskId, setCompleteTaskId] = useState<string | null>(null);
  const [mobileColumn, setMobileColumn] = useState<TaskStatus>("OPEN");
  const [, startTransition] = useTransition();

  const orderStorageKey = `serve-board-order-${currentUserId}`;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(orderStorageKey);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Record<TaskStatus, string[]>;
      setTaskOrderByStatus({
        OPEN: parsed.OPEN ?? [],
        IN_PROGRESS: parsed.IN_PROGRESS ?? [],
        DONE: parsed.DONE ?? []
      });
    } catch (error) {
      setTaskOrderByStatus({ OPEN: [], IN_PROGRESS: [], DONE: [] });
    }
  }, [orderStorageKey]);

  const persistOrder = (nextOrder: Record<TaskStatus, string[]>) => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(orderStorageKey, JSON.stringify(nextOrder));
  };

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (ownershipFilter === "mine") {
        const isMine =
          task.owner?.id === currentUserId ||
          task.coordinator?.id === currentUserId ||
          task.createdById === currentUserId ||
          task.hasVolunteered;
        if (!isMine) {
          return false;
        }
      }
      if (visibilityFilter === "public" && task.visibility !== "PUBLIC") {
        return false;
      }
      if (visibilityFilter === "private" && task.visibility !== "PRIVATE") {
        return false;
      }
      if (query) {
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesNotes = task.notes?.toLowerCase().includes(query);
        const matchesOwner = task.owner?.name.toLowerCase().includes(query);
        const matchesGroup = task.group?.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes && !matchesOwner && !matchesGroup) {
          return false;
        }
      }
      return true;
    });
  }, [currentUserId, ownershipFilter, searchQuery, tasks, visibilityFilter]);

  const tasksById = useMemo(() => {
    return new Map(tasks.map((task) => [task.id, task]));
  }, [tasks]);

  const tasksByStatus = useMemo(() => {
    return statusColumns.reduce<Record<string, TaskListItem[]>>((acc, column) => {
      acc[column.id] = filteredTasks.filter((task) => task.status === column.id);
      return acc;
    }, {});
  }, [filteredTasks]);

  const orderedTasksByStatus = useMemo(() => {
    return statusColumns.reduce<Record<TaskStatus, TaskListItem[]>>((acc, column) => {
      const columnTasks = tasksByStatus[column.id] ?? [];
      const baseOrder = taskOrderByStatus[column.id] ?? [];
      const orderIndex = new Map(baseOrder.map((id, index) => [id, index]));
      const baseIndex = new Map(columnTasks.map((task, index) => [task.id, index]));
      acc[column.id] = [...columnTasks].sort((a, b) => {
        const aOrder = orderIndex.get(a.id);
        const bOrder = orderIndex.get(b.id);
        if (aOrder === undefined && bOrder === undefined) {
          return (baseIndex.get(a.id) ?? 0) - (baseIndex.get(b.id) ?? 0);
        }
        if (aOrder === undefined) {
          return 1;
        }
        if (bOrder === undefined) {
          return -1;
        }
        return aOrder - bOrder;
      });
      return acc;
    }, {} as Record<TaskStatus, TaskListItem[]>);
  }, [taskOrderByStatus, tasksByStatus]);

  const detailTask = useMemo(
    () => tasks.find((task) => task.id === detailTaskId) ?? null,
    [detailTaskId, tasks]
  );
  const completionTask = useMemo(
    () => tasks.find((task) => task.id === completeTaskId) ?? null,
    [completeTaskId, tasks]
  );

  const refreshBoard = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const runTaskAction = async (taskId: string, action: () => Promise<void>, success?: string) => {
    setPendingTaskId(taskId);
    try {
      await action();
      if (success) {
        addToast({ title: success, status: "success" });
      }
    } catch (error) {
      addToast({
        title: t("serve.toasts.updateFailed"),
        description: t("serve.toasts.updateFailedDescription"),
        status: "error"
      });
    } finally {
      setPendingTaskId(null);
      refreshBoard();
    }
  };

  const handleStatusChange = (taskId: string, status: "OPEN" | "IN_PROGRESS" | "DONE") => {
    if (status === "DONE") {
      setCompleteTaskId(taskId);
      return;
    }
    void runTaskAction(taskId, () => updateTaskStatus({ taskId, status }));
  };

  const handleConfirmComplete = async ({
    taskId,
    hoursMode,
    manualHours
  }: {
    taskId: string;
    hoursMode: "estimated" | "manual" | "skip";
    manualHours?: number | null;
  }) => {
    await runTaskAction(
      taskId,
      () => updateTaskStatus({ taskId, status: "DONE", hoursMode, manualHours }),
      t("serve.toasts.markedComplete")
    );
    setCompleteTaskId(null);
  };

  const handleClaim = (taskId: string) =>
    runTaskAction(taskId, () => claimTask({ taskId }), t("serve.toasts.assignedToYou"));

  const handleUnclaim = (taskId: string) =>
    runTaskAction(taskId, () => unclaimTask({ taskId }), t("serve.toasts.unassigned"));

  const handleAssign = (taskId: string, ownerId: string | null) => {
    if (!ownerId) {
      return handleUnclaim(taskId);
    }
    return runTaskAction(taskId, () => claimTask({ taskId, ownerId }), t("serve.toasts.assignmentUpdated"));
  };

  const handleCoordinatorChange = (taskId: string, coordinatorId: string | null) =>
    runTaskAction(taskId, () => updateCoordinator({ taskId, coordinatorId }), t("serve.toasts.coordinatorUpdated"));

  const handleOpenToggle = (taskId: string, openToVolunteers: boolean) =>
    runTaskAction(
      taskId,
      () => updateOpenToVolunteers({ taskId, openToVolunteers }),
      openToVolunteers ? t("serve.toasts.openToVolunteers") : t("serve.toasts.closedToVolunteers")
    );

  const handleVolunteer = (taskId: string) =>
    runTaskAction(taskId, () => volunteerForTask({ taskId }), t("serve.toasts.addedToVolunteers"));

  const handleLeaveVolunteer = (taskId: string) =>
    runTaskAction(taskId, () => leaveTaskVolunteer({ taskId }), t("serve.toasts.leftVolunteerList"));

  const handleDelete = (taskId: string) =>
    runTaskAction(taskId, () => deleteTask({ taskId }), t("serve.toasts.taskDeleted"));

  const updateOrderForStatus = (status: TaskStatus, order: string[]) => {
    setTaskOrderByStatus((prev) => {
      const nextOrder = { ...prev, [status]: order };
      persistOrder(nextOrder);
      return nextOrder;
    });
  };

  const handleDropOnTask = (targetStatus: TaskStatus, targetTaskId?: string) => {
    if (!draggedTaskId) {
      return;
    }
    const draggedTask = tasksById.get(draggedTaskId);
    if (!draggedTask) {
      setDraggedTaskId(null);
      setDragOverColumn(null);
      return;
    }

    // Cross-column drop: change the task's status
    if (draggedTask.status !== targetStatus) {
      if (draggedTask.canManageStatus) {
        void handleStatusChange(draggedTask.id, targetStatus);
      }
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragOverColumn(null);
      return;
    }

    // Same-column drop: reorder within column
    const currentTasks = orderedTasksByStatus[targetStatus] ?? [];
    const baseOrder =
      taskOrderByStatus[targetStatus]?.length ? [...taskOrderByStatus[targetStatus]] : currentTasks.map((task) => task.id);
    const filteredOrder = baseOrder.filter((id) => id !== draggedTaskId);
    if (targetTaskId && filteredOrder.includes(targetTaskId)) {
      const targetIndex = filteredOrder.indexOf(targetTaskId);
      filteredOrder.splice(targetIndex, 0, draggedTaskId);
    } else {
      filteredOrder.push(draggedTaskId);
    }
    updateOrderForStatus(targetStatus, filteredOrder);
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverColumn(null);
  };

  const renderFilterButton = (
    label: string,
    active: boolean,
    onClick: () => void
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition",
        active
          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
          : "border-mist-200 bg-white text-ink-600 hover:bg-mist-50"
      )}
    >
      {label}
    </button>
  );

  const totalOpportunities = filteredTasks.length;

  return (
    <div className="section-gap">
      <QuoteCard
        quote={t("serve.quote")}
        source={t("serve.quoteSource")}
        tone="sky"
      />

      <p className="text-sm text-ink-600">{t("serve.leaderBoardHelper")}</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {renderFilterButton(t("serve.filters.all"), ownershipFilter === "all", () => setOwnershipFilter("all"))}
          {renderFilterButton(t("serve.filters.mine"), ownershipFilter === "mine", () => setOwnershipFilter("mine"))}
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t("serve.searchPlaceholder")}
          className="h-9 w-full rounded-full border border-mist-200 bg-white px-3 text-sm text-ink-700 placeholder:text-ink-400 focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300 sm:h-8 sm:w-56 sm:text-xs"
        />
        <ParishionerRequestButton
          canRequest={canRequestOpportunity}
          requesterEmail={requesterEmail}
          contextType="SERVE_PUBLIC_TASK"
          className="h-10 w-full px-4 text-sm sm:ml-auto sm:h-9 sm:w-auto sm:px-3"
        />
      </div>

      {totalOpportunities === 0 ? (
        <ListEmptyState
          title={t("serve.empty.title")}
          description={t("serve.empty.description")}
          icon={<HeartIcon className="h-6 w-6" />}
          variant="friendly"
          action={
            canRequestOpportunity ? (
              <ParishionerRequestButton
                canRequest={canRequestOpportunity}
                requesterEmail={requesterEmail}
                contextType="SERVE_PUBLIC_TASK"
                className="h-9 px-3 text-sm"
              />
            ) : undefined
          }
        />
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {statusColumns.map((column) => (
          <button
            key={column.id}
            type="button"
            onClick={() => setMobileColumn(column.id)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              mobileColumn === column.id
                ? "border-primary-200 bg-primary-50 text-primary-700"
                : "border-mist-200 bg-white text-ink-600"
            )}
          >
            {t(column.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">
        {statusColumns.map((column) => {
          const columnTasks = orderedTasksByStatus[column.id] ?? [];
          return (
            <div
              key={column.id}
              className={cn(
                "min-w-full flex-1 rounded-lg p-1 transition md:min-w-0",
                mobileColumn !== column.id ? "hidden md:block" : "block",
                dragOverColumn === column.id && draggedTaskId
                  ? "bg-mist-100/60 ring-2 ring-primary-200"
                  : ""
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverColumn(column.id);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={() => handleDropOnTask(column.id)}
            >
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-ink-500">
                <span className={cn("rounded-full px-2 py-1", column.tone)}>{t(column.labelKey)}</span>
                <span>{columnTasks.length}</span>
              </div>
              <div className="space-y-3">
                {columnTasks.map((task) => {
                  const isBusy = pendingTaskId === task.id;
                  const hasOwner = Boolean(task.owner);
                  const isMultiVolunteer = task.volunteersNeeded > 1;
                  const canAssignOthers = task.canAssignOthers && !isBusy;
                  const canClaim = task.canAssignToSelf && !isBusy;
                  const canUnclaim =
                    !isBusy &&
                    task.owner &&
                    (task.owner.id === currentUserId || canAssignOthers);
                  const canJoinVolunteer =
                    !isBusy && isMultiVolunteer && task.canVolunteer && !task.hasVolunteered;
                  const canLeaveVolunteer =
                    !isBusy && isMultiVolunteer && task.hasVolunteered;
                  const canManageStatus = task.canManageStatus && !isBusy;
                  const ownerCompactName = task.owner ? formatCompactName(task.owner.name) : null;
                  const volunteersFull =
                    isMultiVolunteer && task.volunteerCount >= task.volunteersNeeded;

                  return (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", task.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggedTaskId(task.id);
                      }}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverTaskId(null);
                        setDragOverColumn(null);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverTaskId(task.id);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleDropOnTask(column.id, task.id);
                      }}
                      className={cn(
                        "space-y-2.5 p-3 sm:p-4",
                        dragOverTaskId === task.id && draggedTaskId !== task.id
                          ? "ring-2 ring-emerald-200"
                          : ""
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setDetailTaskId(task.id)}
                        className="text-left w-full"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mist-100">
                              <ListChecksIcon className="h-3.5 w-3.5 text-ink-400" />
                            </span>
                            <div className="text-sm font-semibold text-ink-900 leading-snug">{task.title}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            {task.visibility === "PUBLIC" && task.openToVolunteers ? (
                              <Badge
                                tone="success"
                                className="bg-emerald-50 text-emerald-700"
                              >
                                {t("serve.volunteersWelcome")}
                              </Badge>
                            ) : null}
                            {task.group ? (
                              <Badge tone="neutral" className="bg-indigo-50 text-indigo-700">
                                {task.group.name}
                              </Badge>
                            ) : null}
                            {task.estimatedHours ? (
                              <span className="rounded-full bg-mist-100 px-1.5 py-0.5 text-ink-500">
                                {task.estimatedHours}h
                              </span>
                            ) : null}
                            <span className="rounded-full bg-mist-100 px-1.5 py-0.5 text-ink-500">
                              {formatDueDate(task.dueAt, locale)}
                            </span>
                          </div>
                        </div>
                      </button>

                      <div className="space-y-1.5 text-xs text-ink-500">
                        {hasOwner ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[9px] font-semibold text-primary-800">
                              {ownerCompactName}
                            </span>
                            <span className="font-medium text-ink-700" title={task.owner?.name}>
                              {task.owner?.name ?? t("serve.volunteer")}
                            </span>
                          </div>
                        ) : (
                          <div className="text-ink-400">{t("serve.noVolunteerYet")}</div>
                        )}
                        {isMultiVolunteer ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 flex-1 rounded-full bg-mist-200">
                              <div
                                className={cn(
                                  "h-1.5 rounded-full transition-all",
                                  volunteersFull ? "bg-emerald-500" : "bg-primary-400"
                                )}
                                style={{
                                  width: `${Math.min(100, (task.volunteerCount / task.volunteersNeeded) * 100)}%`
                                }}
                              />
                            </div>
                            <span className={cn(
                              "shrink-0 font-medium",
                              volunteersFull ? "text-emerald-600" : "text-ink-500"
                            )}>
                              {task.volunteerCount}/{task.volunteersNeeded}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2 text-xs">
                        {canManageStatus ? (
                          <SelectMenu
                            value={task.status}
                            onValueChange={(next) => {
                              const nextStatus =
                                next === "IN_PROGRESS" || next === "DONE" ? next : "OPEN";
                              void handleStatusChange(task.id, nextStatus);
                            }}
                            options={statusColumns.map((status) => ({
                              value: status.id,
                              label: t(status.labelKey)
                            }))}
                          />
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          {canClaim && !hasOwner && !isMultiVolunteer ? (
                            <Button type="button" size="sm" onClick={() => handleClaim(task.id)}>
                              {t("serve.volunteerAction")}
                            </Button>
                          ) : null}
                          {canJoinVolunteer ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleVolunteer(task.id)}
                              disabled={volunteersFull}
                            >
                              {volunteersFull ? t("serve.full") : t("serve.join")}
                            </Button>
                          ) : null}
                          {canLeaveVolunteer ? (
                            <Button type="button" variant="secondary" size="sm" onClick={() => handleLeaveVolunteer(task.id)}>
                              {t("serve.leave")}
                            </Button>
                          ) : null}
                          {canUnclaim && !isMultiVolunteer ? (
                            <Button type="button" variant="secondary" size="sm" onClick={() => handleUnclaim(task.id)}>
                              {t("serve.stepBack")}
                            </Button>
                          ) : null}
                        </div>

                        {canAssignOthers ? (
                          <SelectMenu
                            value={task.owner?.id ?? ""}
                            onValueChange={(next) => {
                              void handleAssign(task.id, next || null);
                            }}
                            options={[
                              { value: "", label: t("serve.unassigned") },
                              ...memberOptions.map((member) => ({
                                value: member.id,
                                label: member.label ?? member.name
                              }))
                            ]}
                          />
                        ) : null}

                        {isLeader ? (
                          <SelectMenu
                            value={task.coordinator?.id ?? ""}
                            onValueChange={(next) => {
                              void handleCoordinatorChange(task.id, next || null);
                            }}
                            options={[
                              { value: "", label: t("serve.noCoordinator") },
                              ...memberOptions.map((member) => ({
                                value: member.id,
                                label: member.label ?? member.name
                              }))
                            ]}
                          />
                        ) : null}

                        {isLeader && task.visibility === "PUBLIC" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenToggle(task.id, !task.openToVolunteers)}
                          >
                            {task.openToVolunteers ? t("serve.closeToVolunteers") : t("serve.openToVolunteers")}
                          </Button>
                        ) : null}

                        {task.canDelete ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(task.id)}
                          >
                            {t("buttons.delete")}
                          </Button>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <TaskDetailDialog
        taskSummary={detailTask}
        open={Boolean(detailTaskId)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailTaskId(null);
          }
        }}
        currentUserId={currentUserId}
        onRequestComplete={(taskId) => setCompleteTaskId(taskId)}
      />
      <TaskCompletionDialog
        task={completionTask}
        open={Boolean(completeTaskId)}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTaskId(null);
          }
        }}
        onConfirm={handleConfirmComplete}
      />
    </div>
  );
}
