"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TaskEditDialog from "@/components/tasks/TaskEditDialog";
import TaskDetailDialog from "@/components/tasks/TaskDetailDialog";
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

type TasksListProps = {
  tasks: TaskListItem[];
  groupOptions: Array<{ id: string; name: string }>;
  memberOptions: Array<{ id: string; name: string; label?: string }>;
  currentUserId: string;
};

export default function TasksList({
  tasks,
  groupOptions,
  memberOptions,
  currentUserId
}: TasksListProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<TaskListItem | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [, startTransition] = useTransition();

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

  const refreshList = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const runTaskAction = async (taskId: string, action: () => Promise<void>) => {
    setPendingTaskId(taskId);
    try {
      await action();
    } catch (error) {
      addToast({
        title: "Update failed",
        description: "We couldn't update that task. Please try again."
      });
    } finally {
      setPendingTaskId(null);
      refreshList();
    }
  };

  const handleAssignToMe = async (taskId: string) => {
    await runTaskAction(taskId, async () => {
      await assignTaskToSelf({ taskId });
      addToast({
        title: "Assigned to you",
        description: "You are now the primary volunteer for this task."
      });
    });
  };

  const handleUnassign = async (taskId: string) => {
    await runTaskAction(taskId, async () => {
      await unassignTask({ taskId });
      addToast({
        title: "Unassigned",
        description: "This task is now unassigned."
      });
    });
  };

  const handleArchive = async (taskId: string) => {
    await runTaskAction(taskId, async () => {
      await archiveTask({ taskId });
      addToast({
        title: "Archived",
        description: "This task is tucked away but can be restored.",
        actionLabel: "Undo",
        onAction: () => {
          void runTaskAction(taskId, async () => {
            await unarchiveTask({ taskId });
          });
        }
      });
    });
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
    await runTaskAction(taskId, async () => {
      await deleteTask({ taskId });
      addToast({
        title: "Task deleted",
        description: "The task has been removed."
      });
    });
  };

  const handleStartWork = async (taskId: string) => {
    await runTaskAction(taskId, async () => {
      await markTaskInProgress({ taskId });
      addToast({
        title: "Work started",
        description: "This opportunity is now marked as in progress."
      });
    });
  };

  const handleComplete = async (taskId: string) => {
    await runTaskAction(taskId, async () => {
      await markTaskDone({ taskId });
      addToast({
        title: "Completed",
        description: "This task is now marked as complete."
      });
    });
  };

  const handleMarkOpen = async (taskId: string) => {
    await runTaskAction(taskId, async () => {
      await markTaskOpen({ taskId });
    });
  };

  const handleVolunteer = async (taskId: string) => {
    await runTaskAction(taskId, async () => {
      await volunteerForTask({ taskId });
      addToast({
        title: "You're in",
        description: "Thanks for volunteering."
      });
    });
  };

  const handleLeaveVolunteer = async (taskId: string) => {
    await runTaskAction(taskId, async () => {
      await leaveTaskVolunteer({ taskId });
      addToast({
        title: "Removed",
        description: "You have left this volunteer list."
      });
    });
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
              />
            ))}
          </div>
        </section>
      ) : null}

      {inProgressTasks.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span className="font-semibold uppercase tracking-wide text-ink-400">In progress</span>
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
            {showCompleted ? "Hide completed work" : "Show completed work"} ({doneTasks.length})
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
      />
      </div>
      <Modal
        open={Boolean(deleteTaskTarget)}
        onClose={() => setDeleteTaskTarget(null)}
        title="Delete task?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTaskTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={pendingTaskId === deleteTaskTarget?.id}
            >
              Delete task
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
        title="Delete task?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTaskTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={pendingTaskId === deleteTaskTarget?.id}
            >
              Delete task
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
