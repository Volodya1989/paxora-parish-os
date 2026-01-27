"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { TaskDetail, TaskListItem } from "@/lib/queries/tasks";
import { useTranslations } from "@/lib/i18n/provider";
import {
  addTaskComment,
  assignTaskToSelf,
  getTaskDetail,
  leaveTaskVolunteer,
  markTaskDone,
  markTaskInProgress,
  markTaskOpen,
  removeTaskVolunteer,
  volunteerForTask
} from "@/server/actions/tasks";

type TaskDetailDialogProps = {
  taskSummary: TaskListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function formatDueDate(value?: string) {
  if (!value) {
    return "TBD";
  }
  return formatTimestamp(value);
}

export default function TaskDetailDialog({
  taskSummary,
  open,
  onOpenChange,
  currentUserId
}: TaskDetailDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const { addToast } = useToast();
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const taskId = taskSummary?.id ?? null;
  const isVolunteerTask = taskSummary ? taskSummary.volunteersNeeded > 1 : false;
  const hasVolunteered =
    detail?.volunteers.some((volunteer) => volunteer.id === currentUserId) ??
    taskSummary?.hasVolunteered ??
    false;
  const showAssignToMe =
    Boolean(taskSummary?.canAssignToSelf) && !taskSummary?.owner && !isVolunteerTask;

  const refreshDetail = useCallback(async () => {
    if (!taskId) {
      return;
    }
    setIsLoading(true);
    try {
      const data = await getTaskDetail({ taskId });
      setDetail(data);
    } catch (error) {
      addToast({
        title: "Unable to load details",
        description: "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, taskId]);

  useEffect(() => {
    if (!open || !taskId) {
      setDetail(null);
      return;
    }

    void refreshDetail();
  }, [open, refreshDetail, taskId]);

  useEffect(() => {
    if (open) {
      setComment("");
    }
  }, [open, taskId]);

  const handleAction = async (action: () => Promise<void>, successMessage: string) => {
    try {
      await action();
      addToast({
        title: successMessage
      });
      startTransition(() => {
        router.refresh();
      });
      await refreshDetail();
    } catch (error) {
      addToast({
        title: "Update failed",
        description: "Please try again."
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!taskId || !comment.trim()) {
      return;
    }
    await handleAction(
      () => addTaskComment({ taskId, body: comment.trim() }),
      "Comment added"
    );
    setComment("");
  };

  const content = (
    <div className="space-y-6 text-sm text-ink-700">
      <div className="space-y-2">
        <h3 className="text-h3">{taskSummary?.title ?? "Task details"}</h3>
        {taskSummary?.notes ? <p className="text-ink-500">{taskSummary.notes}</p> : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <span className="rounded-full bg-mist-100 px-2 py-1 font-semibold text-ink-600">
            {taskSummary?.status === "DONE"
              ? t("common.done")
              : taskSummary?.status === "IN_PROGRESS"
                ? t("common.inProgress")
                : t("common.todo")}
          </span>
          <span className="rounded-full bg-sky-50 px-2 py-1 font-semibold text-sky-700">
            {taskSummary?.visibility === "PUBLIC" ? t("common.public") : t("common.private")}
          </span>
          {taskSummary?.group ? (
            <span className="rounded-full bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">
              {taskSummary.group.name}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-ink-500">
          Lead:{" "}
          <span className="font-medium text-ink-700">
            {taskSummary?.owner?.name ?? "Unassigned"}
          </span>
        </p>
        <p className="text-xs text-ink-500">
          Due date:{" "}
          <span className="font-medium text-ink-700">
            {taskSummary ? formatDueDate(taskSummary.dueAt) : "TBD"}
          </span>
        </p>
      </div>

      {taskSummary && taskSummary.canManageStatus && taskId ? (
        <div className="flex flex-wrap gap-2">
          {taskSummary.status !== "IN_PROGRESS" && taskSummary.status !== "DONE" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                handleAction(() => markTaskInProgress({ taskId }), "Moved to in progress")
              }
            >
              Start serving
            </Button>
          ) : null}
          {taskSummary.status === "IN_PROGRESS" ? (
            <Button
              type="button"
              onClick={() => handleAction(() => markTaskDone({ taskId }), "Marked complete")}
            >
              Complete task
            </Button>
          ) : null}
          {taskSummary.status === "DONE" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleAction(() => markTaskOpen({ taskId }), "Reopened task")}
            >
              Reopen task
            </Button>
          ) : null}
        </div>
      ) : null}

      {showAssignToMe && taskId ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => handleAction(() => assignTaskToSelf({ taskId }), "Assigned to you")}
          >
            Assign to me
          </Button>
        </div>
      ) : null}

      {isVolunteerTask ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-900">Volunteers</p>
              <p className="text-xs text-ink-500">
                Volunteers: {detail?.volunteers.length ?? 0} of{" "}
                {taskSummary?.volunteersNeeded ?? 0}
              </p>
            </div>
            {taskId ? (
              hasVolunteered ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    handleAction(() => leaveTaskVolunteer({ taskId }), "Left volunteer list")
                  }
                >
                  Leave
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    handleAction(() => volunteerForTask({ taskId }), "Added to volunteers")
                  }
                  disabled={
                    (detail?.volunteers.length ?? 0) >= (taskSummary?.volunteersNeeded ?? 0)
                  }
                >
                  Volunteer
                </Button>
              )
            ) : null}
          </div>
          <div className="space-y-2">
            {detail?.volunteers.length ? (
              detail.volunteers.map((volunteer) => (
                <div
                  key={volunteer.id}
                  className="flex items-center justify-between rounded-card border border-mist-100 bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-100 text-[11px] font-semibold text-ink-700">
                      {volunteer.initials}
                    </span>
                    <span className="text-sm font-medium text-ink-700">{volunteer.name}</span>
                  </div>
                  {taskSummary?.canManage && volunteer.id !== currentUserId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleAction(
                          () =>
                            removeTaskVolunteer({
                              taskId: taskId ?? "",
                              volunteerUserId: volunteer.id
                            }),
                          "Volunteer removed"
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
                No volunteers yet.
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Comments</p>
          <p className="text-xs text-ink-500">Share quick updates or notes.</p>
        </div>
        <div className="space-y-3">
          {detail?.comments.length ? (
            detail.comments.map((commentItem) => (
              <div
                key={commentItem.id}
                className="rounded-card border border-mist-100 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <span className="font-semibold text-ink-700">{commentItem.author.name}</span>
                  <span>· {formatTimestamp(commentItem.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-ink-700">{commentItem.body}</p>
              </div>
            ))
          ) : (
            <div className="rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
              No comments yet.
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            placeholder="Add a comment"
          />
          <div className="flex justify-end">
            <Button type="button" onClick={handleSubmitComment} disabled={!comment.trim()}>
              Post comment
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Activity</p>
          <p className="text-xs text-ink-500">Recent changes and updates.</p>
        </div>
        <div className="space-y-2">
          {detail?.activities.length ? (
            detail.activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-2 rounded-card border border-mist-100 bg-white px-3 py-2 text-xs text-ink-600"
              >
                <span className="font-semibold text-ink-700">{activity.actor.name}</span>
                <span>{activity.description}</span>
                <span className="ml-auto text-ink-400">
                  {formatTimestamp(activity.createdAt)}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
              No activity yet.
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-ink-400">Refreshing details…</p>
      ) : null}
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={handleClose} title="Task details">
        {content}
      </Modal>
      <Drawer open={open} onClose={handleClose} title="Task details">
        {content}
      </Drawer>
    </>
  );
}
