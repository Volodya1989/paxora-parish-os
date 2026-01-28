"use client";

import { useMemo } from "react";
import ListSkeleton from "@/components/app/list-skeleton";
import PinnedBanner from "@/components/chat/PinnedBanner";
import type { ChatMessage, ChatPinnedMessage } from "@/components/chat/types";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getSnippet(text: string, maxLength = 120) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
}

export default function ChatThread({
  messages,
  pinnedMessage,
  canModerate,
  currentUserId,
  onPin,
  onUnpin,
  onDelete,
  onReply,
  onEdit,
  isLoading
}: {
  messages: ChatMessage[];
  pinnedMessage: ChatPinnedMessage | null;
  canModerate: boolean;
  currentUserId?: string;
  onPin: (messageId: string) => void;
  onUnpin: () => void;
  onDelete: (messageId: string) => void;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  isLoading?: boolean;
}) {
  const grouped = useMemo(() => {
    const groups: {
      key: string;
      label: string;
      messages: ChatMessage[];
    }[] = [];
    const map = new Map<string, { label: string; messages: ChatMessage[] }>();

    messages.forEach((message) => {
      const date = new Date(message.createdAt);
      const key = date.toDateString();
      const entry = map.get(key) ?? {
        label: formatDayLabel(date),
        messages: []
      };
      entry.messages.push(message);
      map.set(key, entry);
    });

    Array.from(map.entries()).forEach(([key, value]) => {
      groups.push({ key, label: value.label, messages: value.messages });
    });

    return groups;
  }, [messages]);

  return (
    <div className="space-y-4">
      {pinnedMessage ? (
        <PinnedBanner pinned={pinnedMessage} canModerate={canModerate} onUnpin={onUnpin} />
      ) : null}
      {isLoading ? <ListSkeleton rows={3} /> : null}
      {messages.length === 0 && !isLoading ? (
        <div className="rounded-card border border-dashed border-mist-200 bg-mist-50 px-4 py-6 text-center text-sm text-ink-500">
          No messages yet. Start the conversation.
        </div>
      ) : null}
      {grouped.map((group) => (
        <div key={group.key} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-mist-100" />
            <span className="text-xs font-semibold text-ink-400">{group.label}</span>
            <div className="h-px flex-1 bg-mist-100" />
          </div>
          <div className="space-y-3">
            {group.messages.map((message) => {
              const initials = getInitials(message.author.name) || "PS";
              const isDeleted = Boolean(message.deletedAt);
              const now = Date.now();
              const canEditOwn =
                Boolean(currentUserId) &&
                message.author.id === currentUserId &&
                now - message.createdAt.getTime() <= EDIT_WINDOW_MS;
              const canModify = !isDeleted && (canModerate || canEditOwn);
              const canReply = !isDeleted;
              const parentPreview = message.parentMessage
                ? message.parentMessage.deletedAt
                  ? "Deleted message"
                  : message.parentMessage.body
                : null;
              return (
                <div
                  key={message.id}
                  className="group flex items-start gap-3 rounded-card border border-transparent px-2 py-1 transition hover:border-mist-100"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                    {initials}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink-900">
                        {message.author.name}
                      </p>
                      <p className="text-xs text-ink-400">{formatTime(new Date(message.createdAt))}</p>
                    </div>
                    {message.parentMessage ? (
                      <div className="rounded-md border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
                        <p className="font-semibold text-ink-600">
                          {message.parentMessage.author.name}
                        </p>
                        <p className="mt-1 text-ink-500">
                          {parentPreview ? getSnippet(parentPreview, 140) : "Message unavailable"}
                        </p>
                      </div>
                    ) : null}
                    <p className={isDeleted ? "text-sm italic text-ink-400" : "text-sm text-ink-700"}>
                      {isDeleted ? "This message was deleted." : message.body}
                    </p>
                  </div>
                  {canReply || canModify || canModerate ? (
                    <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                      {canReply ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-ink-500 hover:text-ink-900"
                          onClick={() => onReply(message)}
                        >
                          Thread
                        </button>
                      ) : null}
                      {canModify ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-ink-500 hover:text-ink-900"
                          onClick={() => onEdit(message)}
                        >
                          Edit
                        </button>
                      ) : null}
                      {canModerate && !isDeleted ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-ink-500 hover:text-ink-900"
                          onClick={() => onPin(message.id)}
                        >
                          Pin
                        </button>
                      ) : null}
                      {canModify ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-rose-600 hover:text-rose-700"
                          onClick={() => onDelete(message.id)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
