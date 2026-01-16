"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TaskEditDialog from "@/components/tasks/TaskEditDialog";
import TaskRow from "@/components/tasks/TaskRow";
import { useToast } from "@/components/ui/Toast";
import {
  archiveTask,
  deleteTask,
  markTaskDone,
  unarchiveTask,
  unmarkTaskDone
} from "@/server/actions/tasks";
import type { TaskListItem } from "@/lib/queries/tasks";

type TasksListProps = {
  tasks: TaskListItem[];
  groupOptions: Array<{ id: string; name: string }>;
  memberOptions: Array<{ id: string; name: string }>;
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
  const [showCompleted, setShowCompleted] = useState(false);
  const [, startTransition] = useTransition();

  const { openTasks, doneTasks } = useMemo(() => {
    return {
      openTasks: tasks.filter((task) => task.status === "OPEN"),
      doneTasks: tasks.filter((task) => task.status === "DONE")
    };
  }, [tasks]);

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

  const handleToggle = async (taskId: string, nextStatus: "OPEN" | "DONE") => {
    const action = nextStatus === "DONE" ? markTaskDone : unmarkTaskDone;

    await runTaskAction(taskId, async () => {
      await action({ taskId });
      if (nextStatus === "DONE") {
        addToast({
          title: "Marked done",
          description: "Nice work. You can undo this if needed.",
          actionLabel: "Undo",
          onAction: () => {
            void runTaskAction(taskId, async () => {
              await unmarkTaskDone({ taskId });
            });
          }
        });
      }
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

  const handleDelete = async (taskId: string) => {
    const confirmed = window.confirm(
      "Delete this task? This can’t be undone."
    );
    if (!confirmed) {
      return;
    }
    await runTaskAction(taskId, async () => {
      await deleteTask({ taskId });
      addToast({
        title: "Task deleted",
        description: "The task has been removed."
      });
    });
  };

  return (
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
                onToggle={handleToggle}
                onArchive={handleArchive}
                onEdit={handleEdit}
                onDelete={handleDelete}
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
                  onToggle={handleToggle}
                  onArchive={handleArchive}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
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
    </div>
  );
}
