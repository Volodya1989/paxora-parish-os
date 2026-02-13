"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  onRequestComplete?: (taskId: string) => void;
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


function renderMentionedText(
  body: string,
  mentions: Array<{ userId: string; displayName: string; email: string; start: number; end: number }>
) {
  if (!mentions.length) return body;
  const nodes: Array<string | JSX.Element> = [];
  let cursor = 0;
  mentions
    .slice()
    .sort((a, b) => a.start - b.start)
    .forEach((mention, idx) => {
      if (mention.start < cursor || mention.end > body.length) return;
      if (mention.start > cursor) nodes.push(body.slice(cursor, mention.start));
      nodes.push(
        <span key={`${mention.userId}-${idx}`} className="rounded bg-emerald-100 px-1 text-emerald-800" title={`${mention.displayName} · ${mention.email}`}>
          {body.slice(mention.start, mention.end)}
        </span>
      );
      cursor = mention.end;
    });
  if (cursor < body.length) nodes.push(body.slice(cursor));
  return nodes;
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

export default function TaskDetailDialog({
  taskSummary,
  open,
  onOpenChange,
  currentUserId,
  onRequestComplete
}: TaskDetailDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionUsers, setMentionUsers] = useState<Array<{ id: string; name: string; email: string; avatarUrl?: string | null }>>([]);
  const [selectedMentions, setSelectedMentions] = useState<Array<{ userId: string; displayName: string; email: string }>>([]);
  const [, startTransition] = useTransition();

  const taskId = taskSummary?.id ?? null;
  const isVolunteerTask = taskSummary ? taskSummary.volunteersNeeded > 1 : false;
  const hasVolunteered =
    detail?.volunteers.some((volunteer) => volunteer.id === currentUserId) ??
    taskSummary?.hasVolunteered ??
    false;
  const canVolunteer = Boolean(taskSummary?.canVolunteer);
  const showAssignToMe =
    Boolean(taskSummary?.canAssignToSelf) && !taskSummary?.owner && !isVolunteerTask;
  const ownerCompactName = taskSummary?.owner ? formatCompactName(taskSummary.owner.name) : null;

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
        description: "Please try again.",
        status: "error"
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



  useEffect(() => {
    const match = comment.match(/@([\w-]*)$/);
    setMentionQuery(match ? match[1] ?? "" : null);
  }, [comment]);

  useEffect(() => {
    if (!taskId || mentionQuery === null) {
      setMentionUsers([]);
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      const res = await fetch(`/api/mentions/users?taskId=${taskId}&q=${encodeURIComponent(mentionQuery)}`, { signal: controller.signal });
      if (!res.ok) return;
      const data = await res.json();
      setMentionUsers(data.users ?? []);
    };

    void load();
    return () => controller.abort();
  }, [mentionQuery, taskId]);

  const insertMention = (user: { id: string; name: string; email: string }) => {
    const cleaned = user.name.replace(/\s+/g, " ");
    setComment((prev) => prev.replace(/@[\w-]*$/, `@${cleaned} `));
    setSelectedMentions((prev) => [...prev.filter((item) => item.userId !== user.id), { userId: user.id, displayName: cleaned, email: user.email }]);
    setMentionQuery(null);
  };

  const buildMentionEntities = (text: string) => {
    const entities: Array<{ userId: string; displayName: string; email: string; start: number; end: number }> = [];
    selectedMentions.forEach((mention) => {
      const token = `@${mention.displayName}`;
      let from = 0;
      while (from < text.length) {
        const idx = text.indexOf(token, from);
        if (idx === -1) break;
        entities.push({ userId: mention.userId, displayName: mention.displayName, email: mention.email, start: idx, end: idx + token.length });
        from = idx + token.length;
      }
    });
    return entities.sort((a, b) => a.start - b.start);
  };

  const handleAction = async (action: () => Promise<void>, successMessage: string) => {
    try {
      await action();
      addToast({
        title: successMessage,
        status: "success"
      });
      startTransition(() => {
        router.refresh();
      });
      await refreshDetail();
    } catch (error) {
      addToast({
        title: "Update failed",
        description: "Please try again.",
        status: "error"
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!taskId || !comment.trim()) {
      return;
    }
    await handleAction(
      () => addTaskComment({ taskId, body: comment.trim(), mentionEntities: buildMentionEntities(comment.trim()) }),
      "Comment added"
    );
    setComment("");
  };

  const highlightedCommentId = searchParams.get("comment");

  useEffect(() => {
    if (!open || !highlightedCommentId) return;
    const node = document.querySelector(`[data-task-comment-id="${highlightedCommentId}"]`) as HTMLElement | null;
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (detail) {
      addToast({ title: "Mention target no longer exists", status: "neutral" });
    }
  }, [addToast, detail, open, highlightedCommentId, detail?.comments.length]);

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
          <span
            className="font-medium text-ink-700"
            title={taskSummary?.owner?.name ?? "Unassigned"}
          >
            {ownerCompactName ?? "Unassigned"}
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
              onClick={() =>
                onRequestComplete
                  ? onRequestComplete(taskId)
                  : handleAction(() => markTaskDone({ taskId }), "Marked complete")
              }
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
            {taskId && (canVolunteer || hasVolunteered) ? (
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
                    !canVolunteer ||
                    (detail?.volunteers.length ?? 0) >= (taskSummary?.volunteersNeeded ?? 0)
                  }
                >
                  {canVolunteer ? "Volunteer" : "Closed"}
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
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-100 text-[11px] font-semibold text-ink-700"
                      title={volunteer.name}
                    >
                      {formatCompactName(volunteer.name)}
                    </span>
                    <span
                      className="text-sm font-medium text-ink-700"
                      title={volunteer.name}
                    >
                      {formatCompactName(volunteer.name)}
                    </span>
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
                data-task-comment-id={commentItem.id}
                className={`rounded-card border px-3 py-2 ${highlightedCommentId === commentItem.id ? "border-emerald-300 bg-emerald-50" : "border-mist-100 bg-white"}`}
              >
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <span className="font-semibold text-ink-700">{commentItem.author.name}</span>
                  <span>· {formatTimestamp(commentItem.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-ink-700">{renderMentionedText(commentItem.body, commentItem.mentionEntities ?? [])}</p>
              </div>
            ))
          ) : (
            <div className="rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
              No comments yet.
            </div>
          )}
        </div>
        {mentionUsers.length ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <span className="text-ink-400">Mention</span>
            {mentionUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className="rounded-full border border-mist-200 px-2 py-1 text-xs font-medium text-ink-600 hover:border-mist-300"
                onClick={() => insertMention(user)}
              >
                @{user.name} · {user.email}
              </button>
            ))}
          </div>
        ) : null}
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
