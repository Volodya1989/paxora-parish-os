"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import PollComposer from "@/components/chat/PollComposer";
import { useToast } from "@/components/ui/Toast";
import {
  CHAT_ATTACHMENT_MIME_TYPES,
  MAX_CHAT_ATTACHMENT_SIZE,
  MAX_CHAT_ATTACHMENTS
} from "@/lib/chat/attachments";

const MAX_LENGTH = 1000;

type AttachmentDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

export default function Composer({
  disabled,
  onSend,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  mentionableUsers,
  onCreatePoll
}: {
  disabled: boolean;
  onSend: (body: string, files: File[]) => Promise<void> | void;
  replyTo?: { id: string; authorName: string; body: string; deletedAt: Date | null } | null;
  onCancelReply?: () => void;
  editingMessage?: { id: string; body: string } | null;
  onCancelEdit?: () => void;
  mentionableUsers?: { id: string; name: string }[];
  onCreatePoll?: (question: string, options: string[]) => Promise<void> | void;
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.body);
      setAttachments((current) => {
        current.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
        return [];
      });
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
  const canSend = !isDisabled && (message.trim().length > 0 || attachments.length > 0);

  const handleSend = useCallback(() => {
    if (isDisabled) return;
    const trimmed = message.trim();
    if (!trimmed && attachments.length === 0) return;

    startTransition(async () => {
      await onSend(
        trimmed,
        attachments.map((attachment) => attachment.file)
      );
      setMessage("");
      setAttachments((current) => {
        current.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
        return [];
      });
    });
  }, [attachments, isDisabled, message, onSend]);

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

  const handleAddAttachments = (files: FileList | null) => {
    if (!files) return;

    const selected = Array.from(files);
    const availableSlots = Math.max(0, MAX_CHAT_ATTACHMENTS - attachments.length);
    if (availableSlots === 0) {
      addToast({
        title: "Attachment limit reached",
        description: `You can add up to ${MAX_CHAT_ATTACHMENTS} images.`,
        status: "neutral"
      });
      return;
    }

    const nextAttachments: AttachmentDraft[] = [];
    for (const file of selected) {
      if (nextAttachments.length >= availableSlots) {
        break;
      }
      if (!CHAT_ATTACHMENT_MIME_TYPES.includes(file.type)) {
        addToast({
          title: "Unsupported file type",
          description: "Please choose a JPG, PNG, GIF, or WebP image.",
          status: "neutral"
        });
        continue;
      }
      if (file.size > MAX_CHAT_ATTACHMENT_SIZE) {
        addToast({
          title: "Image too large",
          description: "Images must be 5MB or smaller.",
          status: "neutral"
        });
        continue;
      }

      nextAttachments.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file)
      });
    }

    if (nextAttachments.length > 0) {
      setAttachments((current) => [...current, ...nextAttachments]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const next = current.filter((attachment) => attachment.id !== id);
      const removed = current.find((attachment) => attachment.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  };

  return (
    <div className="border-t border-mist-100 bg-white px-3 py-3 touch-manipulation">
      {/* Poll composer (shown above the input row when active) */}
      {showPollComposer && onCreatePoll ? (
        <div className="mb-3">
          <PollComposer
            onSubmit={async (question, options) => {
              await onCreatePoll(question, options);
              setShowPollComposer(false);
            }}
            onCancel={() => setShowPollComposer(false)}
          />
        </div>
      ) : null}

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
        <input
          ref={fileInputRef}
          type="file"
          accept={CHAT_ATTACHMENT_MIME_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(event) => {
            handleAddAttachments(event.target.files);
            if (event.target) {
              event.target.value = "";
            }
          }}
        />
        {/* Plus button with menu */}
        <div className="relative">
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 transition hover:bg-mist-50 hover:text-ink-700"
            aria-label="Attachments & more"
            aria-expanded={plusMenuOpen}
            disabled={isDisabled}
            onClick={() => setPlusMenuOpen((prev) => !prev)}
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
          {plusMenuOpen ? (
            <>
              <div
                className="fixed inset-0 z-[45]"
                onClick={() => setPlusMenuOpen(false)}
              />
              <div className="absolute bottom-full left-0 z-[50] mb-2 w-44 rounded-xl border border-mist-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-mist-50 active:bg-mist-100"
                  disabled={isEditing}
                  onClick={() => {
                    setPlusMenuOpen(false);
                    if (isEditing) {
                      addToast({
                        title: "Attachments disabled while editing",
                        description: "Finish editing before adding images.",
                        status: "neutral"
                      });
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-ink-400" aria-hidden="true">
                    <path d="M4 3.75A1.75 1.75 0 015.75 2h8.5A1.75 1.75 0 0116 3.75v12.5A1.75 1.75 0 0114.25 18h-8.5A1.75 1.75 0 014 16.25V3.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V3.75a.25.25 0 00-.25-.25h-8.5z" />
                    <path d="M6.75 7a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 006.75 7zm6.5 0a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0013.25 7zM10 9a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 0010 9z" />
                  </svg>
                  Add photos
                </button>
                {onCreatePoll ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-mist-50 active:bg-mist-100"
                    onClick={() => {
                      setShowPollComposer(true);
                      setPlusMenuOpen(false);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-ink-400" aria-hidden="true">
                      <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z" />
                    </svg>
                    Create poll
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

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

      {attachments.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-mist-200"
            >
              <img
                src={attachment.previewUrl}
                alt={attachment.file.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-ink-600 shadow hover:bg-white"
                aria-label={`Remove ${attachment.file.name}`}
                onClick={() => removeAttachment(attachment.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Character count */}
      {remaining < 100 ? (
        <p className="mt-1 text-right text-xs text-ink-400">{remaining} characters remaining</p>
      ) : null}
    </div>
  );
}
