"use client";

import { useEffect, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";

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

  const helperLabel = isEditing ? "Save" : "Send";

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
    <div className="sticky bottom-0 border-t border-mist-100 bg-white py-4">
      <div className="space-y-3">
        {isEditing ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
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
          <div className="flex items-center justify-between gap-3 rounded-md border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
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
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={
            disabled
              ? "This channel is locked."
              : isEditing
                ? "Edit your message..."
                : "Write a message..."
          }
          maxLength={MAX_LENGTH}
          disabled={isDisabled}
        />
        {mentionCandidates.length ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-400">
          <span>{remaining} characters remaining</span>
          <Button type="button" size="sm" onClick={handleSend} disabled={isDisabled}>
            {helperLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
