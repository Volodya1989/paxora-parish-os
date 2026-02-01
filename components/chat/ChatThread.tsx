"use client";

import { useMemo, useState } from "react";
import ListSkeleton from "@/components/app/list-skeleton";
import PinnedBanner from "@/components/chat/PinnedBanner";
import type { ChatMessage, ChatPinnedMessage } from "@/components/chat/types";
import { REACTION_EMOJIS } from "@/lib/chat/reactions";
import { cn } from "@/lib/ui/cn";

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const GROUP_WINDOW_MS = 2 * 60 * 1000;

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

function formatDisplayName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return name;
  if (parts.length === 1) return parts[0];
  const lastInitial = parts[parts.length - 1]?.[0];
  return `${parts[0]} ${lastInitial ? `${lastInitial}.` : ""}`.trim();
}

function getSnippet(text: string, maxLength = 120) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
}

/** Check if two messages belong to the same consecutive group */
function isSameGroup(prev: ChatMessage | null, current: ChatMessage): boolean {
  if (!prev) return false;
  if (prev.author.id !== current.author.id) return false;
  if (prev.deletedAt) return false;
  const diff = Math.abs(
    new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime()
  );
  return diff <= GROUP_WINDOW_MS;
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
  onToggleReaction,
  onViewThread,
  initialReactionMenuMessageId,
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
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onViewThread?: (message: ChatMessage) => void;
  initialReactionMenuMessageId?: string | null;
  isLoading?: boolean;
}) {
  const [openReactionMessageId, setOpenReactionMessageId] = useState<string | null>(
    initialReactionMenuMessageId ?? null
  );
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
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
    <div
      className="rounded-card border border-mist-100 bg-gradient-to-b from-mist-50/70 via-white to-mist-50/40 p-3 shadow-sm"
      onClick={() => {
        setSelectedMessageId(null);
        setOpenReactionMessageId(null);
      }}
    >
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
          <div key={group.key} className="space-y-1">
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-mist-100" />
              <span className="text-xs font-semibold text-ink-400">{group.label}</span>
              <div className="h-px flex-1 bg-mist-100" />
            </div>
            <div className="space-y-0.5">
              {group.messages.map((message, messageIndex) => {
                const previousMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
                const initials = getInitials(message.author.name) || "PS";
                const isDeleted = Boolean(message.deletedAt);
                const isMine = Boolean(currentUserId && message.author.id === currentUserId);
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
                const showThreadLink = Boolean(onViewThread && message.replyCount > 0);
                const showActionRow = canReply || canModify || canModerate;
                const reactions = message.reactions ?? [];
                const hasReactions = reactions.length > 0;
                const canReact = Boolean(onToggleReaction && !isDeleted);
                const isMenuOpen = openReactionMessageId === message.id;
                const isSelected = selectedMessageId === message.id;
                const showControls = isSelected || isMenuOpen;

                const isGrouped = isSameGroup(previousMessage, message);
                const showAuthorBlock = !isGrouped;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "group relative flex",
                      isMine ? "justify-end" : "justify-start",
                      isGrouped ? "mt-0.5" : "mt-3 first:mt-0"
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedMessageId((prev) => (prev === message.id ? null : message.id));
                    }}
                  >
                    {/* Left-side avatar for other users */}
                    {!isMine ? (
                      <div className="mr-2 w-9 shrink-0">
                        {showAuthorBlock ? (
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800"
                            title={message.author.name}
                            aria-label={`View profile for ${message.author.name}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span aria-hidden="true">{initials}</span>
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Bubble */}
                    <div
                      className={cn(
                        "relative w-fit min-w-[60px] max-w-[75%] px-3 py-1.5",
                        isMine
                          ? "rounded-2xl rounded-br-sm bg-emerald-100"
                          : "rounded-2xl rounded-bl-sm bg-white border border-mist-100",
                        isSelected && "ring-1 ring-primary-200"
                      )}
                      tabIndex={0}
                      onFocus={() => setSelectedMessageId(message.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedMessageId((prev) => (prev === message.id ? null : message.id));
                        }
                      }}
                    >
                      {/* Author + time header (first in group only) */}
                      {showAuthorBlock ? (
                        <div className="mb-0.5 flex items-center gap-2">
                          {!isMine ? (
                            <span className="text-xs font-semibold text-ink-700">
                              {formatDisplayName(message.author.name)}
                            </span>
                          ) : null}
                          <span className="sr-only">{message.author.name}</span>
                          <span className="text-xs text-gray-400">
                            {formatTime(new Date(message.createdAt))}
                          </span>
                        </div>
                      ) : null}

                      {/* Reply preview */}
                      {message.parentMessage ? (
                        <div className="mb-1 rounded-md border border-mist-100 border-l-4 border-l-emerald-500/60 bg-emerald-50/50 px-2 py-1.5 text-xs text-ink-500">
                          <p className="font-semibold text-ink-600">
                            {message.parentMessage.author.name}
                          </p>
                          <p className="mt-0.5 break-words text-ink-500">
                            {parentPreview ? getSnippet(parentPreview, 140) : "Message unavailable"}
                          </p>
                        </div>
                      ) : null}

                      {/* Message body */}
                      <p
                        className={cn(
                          "whitespace-pre-wrap text-sm [overflow-wrap:anywhere] [word-break:break-word]",
                          isDeleted ? "italic text-ink-400" : "text-ink-700"
                        )}
                      >
                        {isDeleted ? "This message was deleted." : message.body}
                      </p>

                      {/* Thread link as pill */}
                      {showThreadLink ? (
                        <button
                          type="button"
                          className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            onViewThread?.(message);
                          }}
                        >
                          View thread ({message.replyCount})
                        </button>
                      ) : null}

                      {/* Reactions as inline badges */}
                      {hasReactions || canReact ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {reactions.map((reaction) => (
                            <button
                              key={`${message.id}-${reaction.emoji}`}
                              type="button"
                              className={cn(
                                "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs shadow-sm",
                                reaction.reactedByMe
                                  ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-800"
                                  : "border-mist-200 bg-white font-medium text-ink-600"
                              )}
                              onClick={(event) => {
                                event.stopPropagation();
                                onToggleReaction?.(message.id, reaction.emoji);
                              }}
                            >
                              <span aria-hidden="true">{reaction.emoji}</span>
                              <span>{reaction.count}</span>
                            </button>
                          ))}
                          {canReact ? (
                            <div className="relative">
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full border border-mist-200 bg-white text-xs text-ink-500 transition-opacity hover:text-ink-900",
                                  showControls
                                    ? "opacity-100"
                                    : "opacity-0 sm:group-hover:opacity-100 group-focus-within:opacity-100"
                                )}
                                aria-label="Add reaction"
                                aria-expanded={isMenuOpen}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenReactionMessageId(isMenuOpen ? null : message.id);
                                }}
                              >
                                +
                              </button>
                              {isMenuOpen ? (
                                <div
                                  className={cn(
                                    "absolute top-full z-10 mt-2 grid w-[280px] grid-cols-6 gap-2 rounded-card border border-mist-200 bg-white p-2 shadow-lg",
                                    isMine ? "right-0" : "left-0"
                                  )}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {REACTION_EMOJIS.map((emoji) => (
                                    <button
                                      key={`${message.id}-${emoji}`}
                                      type="button"
                                      className="flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-lg transition hover:border-mist-200 hover:bg-mist-50"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onToggleReaction?.(message.id, emoji);
                                        setOpenReactionMessageId(null);
                                      }}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Action row (reply / edit / pin / delete) */}
                      {showActionRow ? (
                        <div
                          className={cn(
                            "absolute -top-3 z-10 flex items-center gap-1 rounded-full border border-mist-200 bg-white px-1.5 py-0.5 shadow-sm transition-opacity",
                            isMine ? "left-0" : "right-0",
                            showControls
                              ? "opacity-100"
                              : "opacity-0 sm:group-hover:opacity-100 group-focus-within:opacity-100"
                          )}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {canReply ? (
                            <button
                              type="button"
                              className="px-1.5 py-0.5 text-xs font-medium text-ink-500 hover:text-ink-900"
                              onClick={(event) => {
                                event.stopPropagation();
                                onReply(message);
                              }}
                            >
                              Reply
                            </button>
                          ) : null}
                          {canModify ? (
                            <button
                              type="button"
                              className="px-1.5 py-0.5 text-xs font-medium text-ink-500 hover:text-ink-900"
                              onClick={(event) => {
                                event.stopPropagation();
                                onEdit(message);
                              }}
                            >
                              Edit
                            </button>
                          ) : null}
                          {canModerate && !isDeleted ? (
                            <button
                              type="button"
                              className="px-1.5 py-0.5 text-xs font-medium text-ink-500 hover:text-ink-900"
                              onClick={(event) => {
                                event.stopPropagation();
                                onPin(message.id);
                              }}
                            >
                              Pin
                            </button>
                          ) : null}
                          {canModify ? (
                            <button
                              type="button"
                              className="px-1.5 py-0.5 text-xs font-medium text-rose-600 hover:text-rose-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDelete(message.id);
                              }}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
