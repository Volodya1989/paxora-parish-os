"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/ui/cn";

const MAX_LENGTH = 1000;

export default function Composer({
  disabled,
  onSend,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  mentionableUsers
}: {
  disabled: boolean;
  onSend: (body: string) => Promise<void> | void;
  replyTo?: { id: string; authorName: string; body: string; deletedAt: Date | null } | null;
  onCancelReply?: () => void;
  editingMessage?: { id: string; body: string } | null;
  onCancelEdit?: () => void;
  mentionableUsers?: { id: string; name: string }[];
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.body);
      return;
    }
    setMessage("");
  }, [editingMessage]);

  useEffect(() => {
    const match = message.match(/@([\w-]*)$/);
    if (match) {
      setMentionQuery(match[1] ?? "");
      return;
    }
    setMentionQuery(null);
  }, [message]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const remaining = MAX_LENGTH - message.length;
  const isDisabled = disabled || isPending;
  const isEditing = Boolean(editingMessage);

  const handleSend = () => {
    if (isDisabled) {
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    startTransition(async () => {
      await onSend(trimmed);
      setMessage("");
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const mentionCandidates =
    mentionQuery !== null && mentionableUsers?.length
      ? mentionableUsers
          .filter((user) => user.name.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, 5)
      : [];

  const insertMention = (name: string) => {
    setMessage((prev) => prev.replace(/@[\w-]*$/, `@${name.replace(/\s+/g, " ")} `));
    setMentionQuery(null);
  };

  return (
    <div className="border-t border-mist-100 bg-white px-2 py-2">
      {/* Reply/Edit context bar */}
      {isEditing ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded border-l-2 border-amber-400 bg-amber-50 px-2 py-1.5">
          <div className="flex items-center gap-2 text-xs">
            <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-medium text-amber-800">Editing message</span>
          </div>
          {onCancelEdit ? (
            <button
              type="button"
              className="text-xs font-medium text-amber-700 hover:text-amber-900"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : replyTo ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded border-l-2 border-emerald-400 bg-emerald-50 px-2 py-1.5">
          <div className="min-w-0 flex-1 text-xs">
            <span className="font-medium text-emerald-800">
              Replying to {replyTo.authorName}
            </span>
            <span className="ml-1 truncate text-emerald-600">
              {replyTo.deletedAt ? "Deleted message" : replyTo.body.slice(0, 50)}
            </span>
          </div>
          {onCancelReply ? (
            <button
              type="button"
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
              onClick={onCancelReply}
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Mention suggestions */}
      {mentionCandidates.length ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-400">Tag:</span>
          {mentionCandidates.map((user) => (
            <button
              key={user.id}
              type="button"
              className="rounded-full border border-mist-200 bg-white px-2 py-0.5 text-xs font-medium text-ink-600 hover:border-emerald-300 hover:bg-emerald-50"
              onClick={() => insertMention(user.name)}
            >
              @{user.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Composer input */}
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? "This channel is locked"
                : isEditing
                  ? "Edit your message..."
                  : "Write a message..."
            }
            maxLength={MAX_LENGTH}
            disabled={isDisabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400",
              "focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200",
              "disabled:cursor-not-allowed disabled:bg-mist-50 disabled:text-ink-400"
            )}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleSend}
          disabled={isDisabled || !message.trim()}
          className="shrink-0"
        >
          {isEditing ? "Save" : "Send"}
        </Button>
      </div>

      {/* Character count - only show when getting close to limit */}
      {remaining < 200 ? (
        <p className={cn(
          "mt-1 text-right text-xs",
          remaining < 50 ? "text-rose-500" : "text-ink-400"
        )}>
          {remaining} characters remaining
        </p>
      ) : null}
    </div>
  );
}
