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

function formatDueDate(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
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

async function copyTaskDisplayId(displayId: string) {
  await navigator.clipboard.writeText(displayId);
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
        title: t("taskDetail.toasts.loadFailed"),
        description: t("common.tryAgain"),
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
        title: t("taskDetail.toasts.updateFailed"),
        description: t("common.tryAgain"),
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
      t("taskDetail.toasts.commentAdded")
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
      addToast({ title: t("taskDetail.toasts.mentionTargetMissing"), status: "neutral" });
    }
  }, [addToast, detail, open, highlightedCommentId, detail?.comments.length]);

  const content = (
    <div className="space-y-6 text-sm text-ink-700">
      <div className="space-y-2">
        <h3 className="text-h3">{taskSummary?.title ?? t("taskDetail.title")}</h3>
        {taskSummary?.displayId ? (
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span className="rounded-full bg-mist-100 px-2 py-1 font-semibold text-ink-600">{taskSummary.displayId}</span>
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() =>
                copyTaskDisplayId(taskSummary.displayId)
                  .then(() => addToast({ title: t("taskDetail.toasts.idCopied"), status: "success" }))
                  .catch(() => addToast({ title: t("taskDetail.toasts.idCopyFailed"), status: "error" }))
              }
            >
              {t("taskDetail.copyId")}
            </button>
          </div>
        ) : null}
        {taskSummary?.notes ? <p className="text-ink-500">{taskSummary.notes}</p> : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <span className="rounded-full bg-mist-100 px-2 py-1 font-semibold text-ink-600">
            {taskSummary?.status === "ARCHIVED"
              ? t("groups.filters.archived")
              : taskSummary?.status === "DONE"
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
          {t("taskDetail.leadLabel")}{" "}
          <span
            className="font-medium text-ink-700"
            title={taskSummary?.owner?.name ?? t("taskDetail.unassigned")}
          >
            {ownerCompactName ?? t("taskDetail.unassigned")}
          </span>
        </p>
        <p className="text-xs text-ink-500">
          {t("taskDetail.dueDateLabel")}{" "}
          <span className="font-medium text-ink-700">
            {taskSummary ? formatDueDate(taskSummary.dueAt, t("taskDetail.dueDateTbd")) : t("taskDetail.dueDateTbd")}
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
                handleAction(() => markTaskInProgress({ taskId }), t("taskDetail.toasts.movedToInProgress"))
              }
            >
              {t("taskDetail.startServing")}
            </Button>
          ) : null}
          {taskSummary.status === "IN_PROGRESS" ? (
            <Button
              type="button"
              onClick={() =>
                onRequestComplete
                  ? onRequestComplete(taskId)
                  : handleAction(() => markTaskDone({ taskId }), t("taskDetail.toasts.markedComplete"))
              }
            >
              {t("taskDetail.completeTask")}
            </Button>
          ) : null}
          {taskSummary.status === "DONE" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleAction(() => markTaskOpen({ taskId }), t("taskDetail.toasts.reopenedTask"))}
            >
              {t("taskDetail.reopenTask")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {showAssignToMe && taskId ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => handleAction(() => assignTaskToSelf({ taskId }), t("taskDetail.toasts.assignedToYou"))}
          >
            {t("taskDetail.assignToMe")}
          </Button>
        </div>
      ) : null}

      {isVolunteerTask ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-900">{t("taskDetail.volunteers")}</p>
              <p className="text-xs text-ink-500">
                {t("taskDetail.volunteersCount").replace("{current}", String(detail?.volunteers.length ?? 0)).replace("{needed}", String(taskSummary?.volunteersNeeded ?? 0))}
              </p>
            </div>
            {taskId && (canVolunteer || hasVolunteered) ? (
              hasVolunteered ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    handleAction(() => leaveTaskVolunteer({ taskId }), t("taskDetail.toasts.leftVolunteerList"))
                  }
                >
                  {t("taskDetail.leaveVolunteer")}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    handleAction(() => volunteerForTask({ taskId }), t("taskDetail.toasts.addedToVolunteers"))
                  }
                  disabled={
                    !canVolunteer ||
                    (detail?.volunteers.length ?? 0) >= (taskSummary?.volunteersNeeded ?? 0)
                  }
                >
                  {canVolunteer ? t("taskDetail.volunteerAction") : t("taskDetail.volunteerClosed")}
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
                          t("taskDetail.toasts.volunteerRemoved")
                        )
                      }
                    >
                      {t("taskDetail.removeVolunteer")}
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
                {t("taskDetail.noVolunteers")}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">{t("taskDetail.comments")}</p>
          <p className="text-xs text-ink-500">{t("taskDetail.commentsHint")}</p>
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
              {t("taskDetail.noComments")}
            </div>
          )}
        </div>
        {mentionUsers.length ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <span className="text-ink-400">{t("taskDetail.mentionLabel")}</span>
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
            placeholder={t("taskDetail.addComment")}
          />
          <div className="flex justify-end">
            <Button type="button" onClick={handleSubmitComment} disabled={!comment.trim()}>
              {t("taskDetail.postComment")}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">{t("taskDetail.activity")}</p>
          <p className="text-xs text-ink-500">{t("taskDetail.activityHint")}</p>
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
              {t("taskDetail.noActivity")}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-ink-400">{t("taskDetail.refreshing")}</p>
      ) : null}
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={handleClose} title={t("taskDetail.title")}>
        {content}
      </Modal>
      <Drawer open={open} onClose={handleClose} title={t("taskDetail.title")}>
        {content}
      </Drawer>
    </>
  );
}
