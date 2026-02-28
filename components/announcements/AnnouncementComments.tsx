"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  createAnnouncementComment,
  deleteAnnouncementComment,
  listAnnouncementComments
} from "@/server/actions/announcements";

type AnnouncementComment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
  };
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function AnnouncementComments({
  announcementId,
  announcementAuthorId,
  currentUserId,
  canModerateAll,
  initialCount,
  isOpen
}: {
  announcementId: string;
  announcementAuthorId?: string;
  currentUserId: string;
  canModerateAll: boolean;
  initialCount: number;
  isOpen: boolean;
}) {
  const { addToast } = useToast();
  const [comments, setComments] = useState<AnnouncementComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const effectiveCount = loaded ? comments.length : initialCount;

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listAnnouncementComments({ announcementId });
      setComments(next);
      setLoaded(true);
    } catch (error) {
      addToast({
        title: "Unable to load comments",
        description: "Please try again.",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, announcementId]);

  useEffect(() => {
    if (!isOpen || loaded) return;
    void loadComments();
  }, [isOpen, loaded, loadComments]);

  const canDeleteAny = useMemo(
    () => canModerateAll || (announcementAuthorId ? announcementAuthorId === currentUserId : false),
    [announcementAuthorId, canModerateAll, currentUserId]
  );

  const onCreate = async () => {
    setBusy(true);
    try {
      const created = await createAnnouncementComment({
        announcementId,
        content
      });
      setComments((prev) => [...prev, created]);
      setLoaded(true);
      setContent("");
    } catch (error: any) {
      addToast({
        title: "Comment failed",
        description: error?.message ?? "Please try again.",
        status: "error"
      });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (commentId: string) => {
    setBusy(true);
    try {
      await deleteAnnouncementComment({ commentId });
      setComments((prev) => prev.filter((item) => item.id !== commentId));
    } catch (error: any) {
      addToast({
        title: "Delete failed",
        description: error?.message ?? "Please try again.",
        status: "error"
      });
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) {
    return <p className="text-xs text-ink-500">{effectiveCount} comments</p>;
  }

  return (
    <div className="space-y-3 rounded-card border border-mist-100 bg-mist-50 p-3">
      <p className="text-sm font-semibold text-ink-800">Comments ({effectiveCount})</p>
      {loading ? <p className="text-sm text-ink-500">Loading comments…</p> : null}
      {!loading && comments.length === 0 ? <p className="text-sm text-ink-500">No comments yet.</p> : null}
      <div className="space-y-2">
        {comments.map((comment) => {
          const canDelete = canDeleteAny || comment.author.id === currentUserId;
          return (
            <div key={comment.id} className="rounded-card border border-mist-100 bg-white p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-ink-500">
                <span>
                  <span className="font-semibold text-ink-700">{comment.author.name}</span> · {formatTimestamp(comment.createdAt)}
                </span>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    disabled={busy}
                    className="text-rose-600 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{comment.content}</p>
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Leave a comment"
          className="w-full rounded-card border border-mist-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-primary-300 focus:outline-none"
        />
        <div className="flex justify-end">
          <Button type="button" onClick={onCreate} disabled={busy || !content.trim()} size="sm">
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
