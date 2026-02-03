"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

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

  const remaining = MAX_LENGTH - message.length;
  const isDisabled = disabled || isPending;
  const isEditing = Boolean(editingMessage);
  const canSend = !isDisabled && message.trim().length > 0;

  const handleSend = useCallback(() => {
    if (isDisabled) return;
    const trimmed = message.trim();
    if (!trimmed) return;

    startTransition(async () => {
      await onSend(trimmed);
      setMessage("");
    });
  }, [isDisabled, message, onSend]);

  /** Auto-resize the textarea to fit content */
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [message, adjustHeight]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
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
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-mist-100 bg-white px-3 py-3">
      {/* Editing / reply context banners */}
      {isEditing ? (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
          <div>
            <p className="font-semibold text-ink-700">Editing message</p>
            <p className="text-ink-500">Make your changes and save.</p>
          </div>
          {onCancelEdit ? (
            <button
              type="button"
              className="text-xs font-semibold text-ink-600 hover:text-ink-900"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : replyTo ? (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
          <div className="min-w-0">
            <p className="font-semibold text-ink-700">
              Replying in thread to {replyTo.authorName}
            </p>
            <p className="truncate text-ink-500">
              {replyTo.deletedAt ? "Deleted message" : replyTo.body}
            </p>
          </div>
          {onCancelReply ? (
            <button
              type="button"
              className="text-xs font-semibold text-ink-600 hover:text-ink-900"
              onClick={onCancelReply}
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Mention autocomplete */}
      {mentionCandidates.length ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <span className="text-ink-400">Tag a member:</span>
          {mentionCandidates.map((user) => (
            <button
              key={user.id}
              type="button"
              className="rounded-full border border-mist-200 px-2 py-1 text-xs font-medium text-ink-600 hover:border-mist-300 hover:text-ink-900"
              onClick={() => insertMention(user.name)}
            >
              @{user.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Input row */}
      <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
        {/* Attachment / plus button */}
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 transition hover:bg-mist-50 hover:text-ink-700"
          aria-label="Attach file"
          disabled={isDisabled}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </button>

        {/* Auto-expanding textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "This channel is locked."
              : isEditing
                ? "Edit your message..."
                : "Write a message..."
          }
          maxLength={MAX_LENGTH}
          disabled={isDisabled}
          rows={1}
          className="max-h-40 min-h-[36px] flex-1 resize-none border-0 bg-transparent py-1.5 text-base text-ink-700 placeholder:text-ink-400 focus:outline-none focus:ring-0"
          aria-label="Message input"
        />

        {/* Send button */}
        <button
          type="button"
          className={
            canSend
              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-500 active:bg-emerald-700"
              : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-400 cursor-not-allowed"
          }
          aria-label={isEditing ? "Save" : "Send"}
          disabled={!canSend}
          onClick={handleSend}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Character count */}
      {remaining < 100 ? (
        <p className="mt-1 text-right text-xs text-ink-400">{remaining} characters remaining</p>
      ) : null}
    </div>
  );
}
