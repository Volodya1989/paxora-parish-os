"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TaskEditDialog from "@/components/tasks/TaskEditDialog";
import TaskDetailDialog from "@/components/tasks/TaskDetailDialog";
import TaskCompletionDialog from "@/components/tasks/TaskCompletionDialog";
import TaskRow from "@/components/tasks/TaskRow";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import {
  archiveTask,
  assignTaskToSelf,
  deleteTask,
  leaveTaskVolunteer,
  markTaskDone,
  markTaskInProgress,
  markTaskOpen,
  unarchiveTask,
  unassignTask,
  volunteerForTask
} from "@/server/actions/tasks";
import type { TaskListItem } from "@/lib/queries/tasks";
import { useTranslations } from "@/lib/i18n/provider";
import { getScrollBehavior, getServeCardAnchorId, isTaskCardFullyVisible } from "@/lib/tasks/serveCardMove";
import { trackTaskCompleted } from "@/lib/analytics-events";

type TasksListProps = {
  tasks: TaskListItem[];
  groupOptions: Array<{ id: string; name: string }>;
  memberOptions: Array<{ id: string; name: string; label?: string }>;
  currentUserId: string;
  isMyCommitmentsContext?: boolean;
};

export default function TasksList({
  tasks,
  groupOptions,
  memberOptions,
  currentUserId,
  isMyCommitmentsContext = false
}: TasksListProps) {
  const t = useTranslations();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingAction, setPendingAction] = useState<{ taskId: string; type: "status" | "other" } | null>(null);
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<TaskListItem | null>(null);
  const [completeTaskId, setCompleteTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [lastMovedTaskId, setLastMovedTaskId] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [enteringTaskId, setEnteringTaskId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const pendingTaskId = pendingAction?.taskId ?? null;

  const { openTasks, inProgressTasks, doneTasks } = useMemo(() => {
    return {
      openTasks: tasks.filter((task) => task.status === "OPEN"),
      inProgressTasks: tasks.filter((task) => task.status === "IN_PROGRESS"),
      doneTasks: tasks.filter((task) => task.status === "DONE")
    };
  }, [tasks]);

  const detailTask = useMemo(
    () => tasks.find((task) => task.id === detailTaskId) ?? null,
    [detailTaskId, tasks]
  );
  const completionTask = useMemo(
    () => tasks.find((task) => task.id === completeTaskId) ?? null,
    [completeTaskId, tasks]
  );



  useEffect(() => {
    const taskIdFromUrl = searchParams.get("taskId");
    if (!taskIdFromUrl) return;
    if (tasks.some((task) => task.id === taskIdFromUrl)) {
      setDetailTaskId(taskIdFromUrl);
    }
  }, [searchParams, tasks]);

  useEffect(() => {
    if (!lastMovedTaskId || typeof window === "undefined") {
      return;
    }

    let frame = 0;
    let animationFrameId = 0;
    const maxFrames = 60;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anchorId = getServeCardAnchorId(lastMovedTaskId);

    const applyFocusState = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const isVisible = isTaskCardFullyVisible(rect, window.innerHeight);
      if (!isVisible) {
        element.scrollIntoView({
          behavior: getScrollBehavior(prefersReducedMotion),
          block: "center"
        });
      }

      setEnteringTaskId(lastMovedTaskId);
      requestAnimationFrame(() => setEnteringTaskId(null));
      setHighlightedTaskId(lastMovedTaskId);
      window.setTimeout(() => {
        setHighlightedTaskId((current) => (current === lastMovedTaskId ? null : current));
      }, 1800);
      setLastMovedTaskId(null);
    };

    const waitForAnchor = () => {
      const element = document.getElementById(anchorId);
      if (element) {
        applyFocusState(element);
        return;
      }

      if (frame >= maxFrames) {
        setLastMovedTaskId(null);
        return;
      }

      frame += 1;
      animationFrameId = window.requestAnimationFrame(waitForAnchor);
    };

    waitForAnchor();

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [lastMovedTaskId, tasks]);

  const refreshList = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const runTaskAction = async ({
    taskId,
    action,
    type = "other",
    movedToStatus
  }: {
    taskId: string;
    action: () => Promise<void>;
    type?: "status" | "other";
    movedToStatus?: "OPEN" | "IN_PROGRESS" | "DONE";
  }) => {
    setPendingAction({ taskId, type });
    try {
      await action();
      if (movedToStatus) {
        if (movedToStatus === "DONE") {
          setShowCompleted(true);
        }
        setLastMovedTaskId(taskId);
      }
    } catch (error) {
      addToast({
        title: "Update failed",
        description: "We couldn't update that task. Please try again.",
        status: "error"
      });
    } finally {
      setPendingAction(null);
      refreshList();
    }
  };

  const handleAssignToMe = async (taskId: string) => {
    await runTaskAction({ taskId, action: async () => {
      await assignTaskToSelf({ taskId });
      addToast({
        title: "Assigned to you",
        description: "You are now the primary volunteer for this task.",
        status: "success"
      });
    } });
  };

  const handleUnassign = async (taskId: string) => {
    await runTaskAction({ taskId, action: async () => {
      await unassignTask({ taskId });
      addToast({
        title: "Unassigned",
        description: "This task is now unassigned.",
        status: "success"
      });
    } });
  };

  const handleArchive = async (taskId: string) => {
    await runTaskAction({ taskId, action: async () => {
      await archiveTask({ taskId });
      addToast({
        title: "Archived",
        description: "This task is tucked away but can be restored.",
        status: "success",
        actionLabel: "Undo",
        onAction: () => {
          void runTaskAction({ taskId, action: async () => {
            await unarchiveTask({ taskId });
          } });
        }
      });
    } });
  };

  const handleEdit = (task: TaskListItem) => {
    setEditingTask(task);
  };

  const handleDeleteRequest = (taskId: string) => {
    const target = tasks.find((task) => task.id === taskId) ?? null;
    setDeleteTaskTarget(target);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTaskTarget) {
      return;
    }
    const taskId = deleteTaskTarget.id;
    setDeleteTaskTarget(null);
    await runTaskAction({ taskId, action: async () => {
      await deleteTask({ taskId });
      addToast({
        title: "Task deleted",
        description: "The task has been removed.",
        status: "success"
      });
    } });
  };

  const handleStartWork = async (taskId: string) => {
    await runTaskAction({
      taskId,
      type: "status",
      movedToStatus: "IN_PROGRESS",
      action: async () => {
      await markTaskInProgress({ taskId });
      addToast({
        title: "Work started",
        description: "This opportunity is now marked as in progress.",
        status: "success"
      });
      }
    });
  };

  const handleComplete = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (task?.visibility === "PRIVATE") {
      await runTaskAction({
        taskId,
        type: "status",
        movedToStatus: "DONE",
        action: async () => {
          await markTaskDone({ taskId, hoursMode: "skip" });
          trackTaskCompleted({
            taskId,
            hoursMode: "skip",
            hadManualHours: false
          });
          addToast({
            title: "Completed",
            description: "This task is now marked as complete.",
            status: "success"
          });
        }
      });
      return;
    }

    setCompleteTaskId(taskId);
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
    await runTaskAction({
      taskId,
      type: "status",
      movedToStatus: "DONE",
      action: async () => {
      await markTaskDone({ taskId, hoursMode, manualHours });
      trackTaskCompleted({
        taskId,
        hoursMode,
        hadManualHours: typeof manualHours === "number"
      });
      addToast({
        title: "Completed",
        description: "This task is now marked as complete.",
        status: "success"
      });
      }
    });
    setCompleteTaskId(null);
  };

  const handleMarkOpen = async (taskId: string) => {
    await runTaskAction({
      taskId,
      type: "status",
      movedToStatus: "OPEN",
      action: async () => {
      await markTaskOpen({ taskId });
      }
    });
  };

  const handleVolunteer = async (taskId: string) => {
    await runTaskAction({ taskId, action: async () => {
      await volunteerForTask({ taskId });
      addToast({
        title: "You're in",
        description: "Thanks for volunteering.",
        status: "success"
      });
    } });
  };

  const handleLeaveVolunteer = async (taskId: string) => {
    await runTaskAction({ taskId, action: async () => {
      await leaveTaskVolunteer({ taskId });
      addToast({
        title: "Removed",
        description: "You have left this volunteer list.",
        status: "success"
      });
    } });
  };

  return (
    <>
      <div className="space-y-6">
      {openTasks.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span className="font-semibold uppercase tracking-wide text-ink-400">Open</span>
            <span>{openTasks.length}</span>
          </div>
          <div className="space-y-3">
            {openTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStartWork={handleStartWork}
                onMarkDone={handleComplete}
                onMarkOpen={handleMarkOpen}
                onAssignToMe={handleAssignToMe}
                onUnassign={handleUnassign}
                onVolunteer={handleVolunteer}
                onLeaveVolunteer={handleLeaveVolunteer}
                onViewDetails={() => setDetailTaskId(task.id)}
                onArchive={handleArchive}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                currentUserId={currentUserId}
                isBusy={pendingTaskId === task.id}
                isStatusUpdating={pendingTaskId === task.id && pendingAction?.type === "status"}
                isHighlighted={highlightedTaskId === task.id}
                isEntering={enteringTaskId === task.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {inProgressTasks.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span className="font-semibold uppercase tracking-wide text-ink-400">
              {t("common.inProgress")}
            </span>
            <span>{inProgressTasks.length}</span>
          </div>
          <div className="space-y-3">
            {inProgressTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStartWork={handleStartWork}
                onMarkDone={handleComplete}
                onMarkOpen={handleMarkOpen}
                onAssignToMe={handleAssignToMe}
                onUnassign={handleUnassign}
                onVolunteer={handleVolunteer}
                onLeaveVolunteer={handleLeaveVolunteer}
                onViewDetails={() => setDetailTaskId(task.id)}
                onArchive={handleArchive}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                currentUserId={currentUserId}
                isBusy={pendingTaskId === task.id}
                isStatusUpdating={pendingTaskId === task.id && pendingAction?.type === "status"}
                isHighlighted={highlightedTaskId === task.id}
                isEntering={enteringTaskId === task.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {doneTasks.length > 0 ? (
        <section className="space-y-3">
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-wide text-primary-700"
            onClick={() => setShowCompleted((current) => !current)}
          >
            {showCompleted ? t("tasks.completed.hide") : t("tasks.completed.show")} ({doneTasks.length})
          </button>
          {showCompleted ? (
            <div className="space-y-3">
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStartWork={handleStartWork}
                  onMarkDone={handleComplete}
                  onMarkOpen={handleMarkOpen}
                  onAssignToMe={handleAssignToMe}
                  onUnassign={handleUnassign}
                  onVolunteer={handleVolunteer}
                  onLeaveVolunteer={handleLeaveVolunteer}
                  onViewDetails={() => setDetailTaskId(task.id)}
                  onArchive={handleArchive}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                  currentUserId={currentUserId}
                  isBusy={pendingTaskId === task.id}
                  isStatusUpdating={pendingTaskId === task.id && pendingAction?.type === "status"}
                  isHighlighted={highlightedTaskId === task.id}
                  isEntering={enteringTaskId === task.id}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <TaskEditDialog
        open={Boolean(editingTask)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTask(null);
          }
        }}
        task={editingTask}
        groupOptions={groupOptions}
        memberOptions={memberOptions}
        currentUserId={currentUserId}
        forcePrivate={isMyCommitmentsContext && editingTask?.visibility === "PRIVATE"}
        hideEstimatedHours={isMyCommitmentsContext && editingTask?.visibility === "PRIVATE"}
      />

      <TaskDetailDialog
        open={Boolean(detailTaskId)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailTaskId(null);
          }
        }}
        taskSummary={detailTask}
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
      <Modal
        open={Boolean(deleteTaskTarget)}
        onClose={() => setDeleteTaskTarget(null)}
        title={`${t("buttons.delete")} task?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTaskTarget(null)}>
              {t("buttons.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={pendingTaskId === deleteTaskTarget?.id}
            >
              {t("buttons.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          {deleteTaskTarget?.title ?? "This task"} will be removed permanently. This can’t be undone.
        </p>
      </Modal>
      <Drawer
        open={Boolean(deleteTaskTarget)}
        onClose={() => setDeleteTaskTarget(null)}
        title={`${t("buttons.delete")} task?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTaskTarget(null)}>
              {t("buttons.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={pendingTaskId === deleteTaskTarget?.id}
            >
              {t("buttons.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          {deleteTaskTarget?.title ?? "This task"} will be removed permanently. This can’t be undone.
        </p>
      </Drawer>
    </>
  );
}
