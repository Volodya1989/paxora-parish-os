"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import SelectMenu from "@/components/ui/SelectMenu";
import Card from "@/components/ui/Card";
import TaskDetailDialog from "@/components/tasks/TaskDetailDialog";
import TaskCompletionDialog from "@/components/tasks/TaskCompletionDialog";
import OpportunityRequestDialog from "@/components/serve-board/OpportunityRequestDialog";
import ListEmptyState from "@/components/app/list-empty-state";
import { HeartIcon, ListChecksIcon } from "@/components/icons/ParishIcons";
import { useToast } from "@/components/ui/Toast";
import QuoteCard from "@/components/app/QuoteCard";
import {
  claimTask,
  deleteTask,
  unclaimTask,
  updateCoordinator,
  updateOpenToVolunteers,
  updateTaskStatus
} from "@/server/actions/serve-board";
import type { TaskListItem } from "@/lib/queries/tasks";
import { cn } from "@/lib/ui/cn";

const statusColumns = [
  { id: "OPEN", label: "Help needed", tone: "bg-sky-50 text-sky-700" },
  { id: "IN_PROGRESS", label: "In progress", tone: "bg-amber-50 text-amber-700" },
  { id: "DONE", label: "Completed", tone: "bg-emerald-50 text-emerald-700" }
] as const;

type TaskStatus = (typeof statusColumns)[number]["id"];

type ServeBoardViewProps = {
  tasks: TaskListItem[];
  memberOptions: Array<{ id: string; name: string; label?: string }>;
  currentUserId: string;
  isLeader: boolean;
};

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
  isLeader
}: ServeBoardViewProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<"all" | "mine">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [taskOrderByStatus, setTaskOrderByStatus] = useState<Record<TaskStatus, string[]>>({
    OPEN: [],
    IN_PROGRESS: [],
    DONE: []
  });
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [completeTaskId, setCompleteTaskId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
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
    return tasks.filter((task) => {
      if (ownershipFilter === "mine") {
        const isMine =
          task.owner?.id === currentUserId ||
          task.coordinator?.id === currentUserId ||
          task.createdById === currentUserId;
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
      return true;
    });
  }, [currentUserId, ownershipFilter, tasks, visibilityFilter]);

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
        title: "Update failed",
        description: "We couldn't update that task. Please try again.",
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
      "Marked complete"
    );
    setCompleteTaskId(null);
  };

  const handleClaim = (taskId: string) =>
    runTaskAction(taskId, () => claimTask({ taskId }), "Assigned to you");

  const handleUnclaim = (taskId: string) =>
    runTaskAction(taskId, () => unclaimTask({ taskId }), "Unassigned");

  const handleAssign = (taskId: string, ownerId: string | null) => {
    if (!ownerId) {
      return handleUnclaim(taskId);
    }
    return runTaskAction(taskId, () => claimTask({ taskId, ownerId }), "Assignment updated");
  };

  const handleCoordinatorChange = (taskId: string, coordinatorId: string | null) =>
    runTaskAction(taskId, () => updateCoordinator({ taskId, coordinatorId }), "Coordinator updated");

  const handleOpenToggle = (taskId: string, openToVolunteers: boolean) =>
    runTaskAction(
      taskId,
      () => updateOpenToVolunteers({ taskId, openToVolunteers }),
      openToVolunteers ? "Open to volunteers" : "Closed to volunteers"
    );

  const handleDelete = (taskId: string) =>
    runTaskAction(taskId, () => deleteTask({ taskId }), "Task deleted");

  const updateOrderForStatus = (status: TaskStatus, order: string[]) => {
    setTaskOrderByStatus((prev) => {
      const nextOrder = { ...prev, [status]: order };
      persistOrder(nextOrder);
      return nextOrder;
    });
  };

  const handleDropOnTask = (status: TaskStatus, targetTaskId?: string) => {
    if (!draggedTaskId) {
      return;
    }
    const draggedTask = tasksById.get(draggedTaskId);
    if (!draggedTask || draggedTask.status !== status) {
      setDraggedTaskId(null);
      return;
    }
    const currentTasks = orderedTasksByStatus[status] ?? [];
    const baseOrder =
      taskOrderByStatus[status]?.length ? [...taskOrderByStatus[status]] : currentTasks.map((task) => task.id);
    const filteredOrder = baseOrder.filter((id) => id !== draggedTaskId);
    if (targetTaskId && filteredOrder.includes(targetTaskId)) {
      const targetIndex = filteredOrder.indexOf(targetTaskId);
      filteredOrder.splice(targetIndex, 0, draggedTaskId);
    } else {
      filteredOrder.push(draggedTaskId);
    }
    updateOrderForStatus(status, filteredOrder);
    setDraggedTaskId(null);
    setDragOverTaskId(null);
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
        quote="Each of you should use whatever gift you have received to serve others."
        source="1 Peter 4:10"
        tone="sky"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => setRequestOpen(true)}
          className="h-10 px-4 text-sm"
        >
          Request an opportunity
        </Button>
        {renderFilterButton("All", ownershipFilter === "all", () => setOwnershipFilter("all"))}
        {renderFilterButton("Mine", ownershipFilter === "mine", () => setOwnershipFilter("mine"))}
      </div>

      {totalOpportunities === 0 ? (
        <ListEmptyState
          title="New opportunities coming soon"
          description="Check back to find ways you can contribute your time and talents to our parish community."
          icon={<HeartIcon className="h-6 w-6" />}
          variant="friendly"
          action={
            <Button onClick={() => setRequestOpen(true)}>
              Request an opportunity
            </Button>
          }
        />
      ) : null}

      <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">
        {statusColumns.map((column) => {
          const columnTasks = orderedTasksByStatus[column.id] ?? [];
          return (
            <div
              key={column.id}
              className="min-w-[280px] flex-1 md:min-w-0"
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={() => handleDropOnTask(column.id)}
            >
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-ink-500">
                <span className={cn("rounded-full px-2 py-1", column.tone)}>{column.label}</span>
                <span>{columnTasks.length}</span>
              </div>
              <div className="space-y-3">
                {columnTasks.map((task) => {
                  const isBusy = pendingTaskId === task.id;
                  const hasOwner = Boolean(task.owner);
                  const canAssignOthers = task.canAssignOthers && !isBusy;
                  const canClaim = task.canAssignToSelf && !isBusy;
                  const canUnclaim =
                    !isBusy &&
                    task.owner &&
                    (task.owner.id === currentUserId || canAssignOthers);
                  const canManageStatus = task.canManageStatus && !isBusy;
                  const ownerCompactName = task.owner ? formatCompactName(task.owner.name) : null;

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
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverTaskId(task.id);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        handleDropOnTask(column.id, task.id);
                      }}
                      className={cn(
                        "space-y-3 p-3 sm:p-4",
                        dragOverTaskId === task.id && draggedTaskId !== task.id
                          ? "ring-2 ring-emerald-200"
                          : ""
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setDetailTaskId(task.id)}
                        className="text-left"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mist-100">
                              <ListChecksIcon className="h-3.5 w-3.5 text-ink-400" />
                            </span>
                            <div className="text-sm font-semibold text-ink-900">{task.title}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                            {task.visibility === "PUBLIC" && task.openToVolunteers ? (
                              <Badge
                                tone="success"
                                className="bg-emerald-50 text-emerald-700"
                              >
                                Volunteers welcome
                              </Badge>
                            ) : null}
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
                              {task.owner?.name ?? "Volunteer"}
                            </span>
                          </div>
                        ) : (
                          <div className="text-ink-400">No one yet — be the first!</div>
                        )}
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
                              label: status.label
                            }))}
                          />
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          {canClaim && !hasOwner ? (
                            <Button type="button" size="sm" onClick={() => handleClaim(task.id)}>
                              Volunteer
                            </Button>
                          ) : null}
                          {canUnclaim ? (
                            <Button type="button" variant="secondary" size="sm" onClick={() => handleUnclaim(task.id)}>
                              Step back
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
                              { value: "", label: "Unassigned" },
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
                              { value: "", label: "No coordinator" },
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
                            {task.openToVolunteers ? "Close to volunteers" : "Open to volunteers"}
                          </Button>
                        ) : null}

                        {task.canDelete ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(task.id)}
                          >
                            Delete
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
      <OpportunityRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
      />
    </div>
  );
}
