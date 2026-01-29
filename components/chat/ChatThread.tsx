"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ListSkeleton from "@/components/app/list-skeleton";
import PinnedBanner from "@/components/chat/PinnedBanner";
import type { ChatMessage, ChatPinnedMessage } from "@/components/chat/types";
import { REACTION_EMOJIS } from "@/lib/chat/reactions";
import { cn } from "@/lib/ui/cn";

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

function getSnippet(text: string, maxLength = 100) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}...`;
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
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [openReactionMessageId, setOpenReactionMessageId] = useState<string | null>(
    initialReactionMenuMessageId ?? null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Close selection when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSelectedMessageId(null);
        setOpenReactionMessageId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

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

  const handleMessageTap = (messageId: string) => {
    setSelectedMessageId((prev) => (prev === messageId ? null : messageId));
    if (openReactionMessageId && openReactionMessageId !== messageId) {
      setOpenReactionMessageId(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="rounded-card border border-mist-100 bg-white"
    >
      <div className="space-y-1 p-2">
        {pinnedMessage ? (
          <PinnedBanner pinned={pinnedMessage} canModerate={canModerate} onUnpin={onUnpin} />
        ) : null}
        {isLoading ? <ListSkeleton rows={3} /> : null}
        {messages.length === 0 && !isLoading ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-ink-500">No messages yet</p>
            <p className="mt-1 text-xs text-ink-400">Start the conversation</p>
          </div>
        ) : null}
        {grouped.map((group) => (
          <div key={group.key} className="space-y-1">
            <div className="flex items-center justify-center py-2">
              <span className="rounded-full bg-mist-100 px-3 py-1 text-xs font-medium text-ink-500">
                {group.label}
              </span>
            </div>
            <div className="space-y-0.5">
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
                const showThreadLink = Boolean(onViewThread && message.replyCount > 0);
                const reactions = message.reactions ?? [];
                const hasReactions = reactions.length > 0;
                const canReact = Boolean(onToggleReaction && !isDeleted);
                const isSelected = selectedMessageId === message.id;
                const isReactionMenuOpen = openReactionMessageId === message.id;
                const showActions = isSelected || isReactionMenuOpen;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "group relative rounded-lg px-2 py-1.5 transition-colors",
                      isSelected && "bg-mist-50",
                      !isSelected && "hover:bg-mist-50/50"
                    )}
                    onClick={() => handleMessageTap(message.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleMessageTap(message.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar - smaller for compact view */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                        {initials}
                      </div>

                      {/* Message content */}
                      <div className="min-w-0 flex-1">
                        {/* Header row */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-ink-900">
                            {message.author.name}
                          </span>
                          <span className="text-xs text-ink-400">
                            {formatTime(new Date(message.createdAt))}
                          </span>
                        </div>

                        {/* Reply quote - more compact */}
                        {message.parentMessage ? (
                          <div className="mt-1 flex items-center gap-2 rounded border-l-2 border-emerald-300 bg-mist-50 py-1 pl-2 pr-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-medium text-ink-600">
                                {message.parentMessage.author.name}:
                              </span>
                              <span className="ml-1 text-xs text-ink-500">
                                {parentPreview ? getSnippet(parentPreview, 60) : "Message unavailable"}
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {/* Message body */}
                        <p
                          className={cn(
                            "mt-0.5 break-words text-sm leading-relaxed",
                            isDeleted ? "italic text-ink-400" : "text-ink-700"
                          )}
                        >
                          {isDeleted ? "This message was deleted." : message.body}
                        </p>

                        {/* Thread link */}
                        {showThreadLink ? (
                          <button
                            type="button"
                            className="mt-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewThread?.(message);
                            }}
                          >
                            View thread ({message.replyCount})
                          </button>
                        ) : null}

                        {/* Reactions - always visible if present */}
                        {hasReactions ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {reactions.map((reaction) => (
                              <button
                                key={`${message.id}-${reaction.emoji}`}
                                type="button"
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition",
                                  reaction.reactedByMe
                                    ? "border border-emerald-200 bg-emerald-50 font-medium text-emerald-800"
                                    : "border border-mist-200 bg-white text-ink-600 hover:bg-mist-50"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleReaction?.(message.id, reaction.emoji);
                                }}
                              >
                                <span aria-hidden="true">{reaction.emoji}</span>
                                {reaction.count > 1 && <span>{reaction.count}</span>}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {/* Desktop: hover actions */}
                      <div className="hidden items-center gap-1 opacity-0 transition group-hover:opacity-100 sm:flex">
                        {canReact ? (
                          <button
                            type="button"
                            className="rounded p-1 text-ink-400 hover:bg-mist-100 hover:text-ink-600"
                            aria-label="Add reaction"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenReactionMessageId(
                                isReactionMenuOpen ? null : message.id
                              );
                            }}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        ) : null}
                        {canReply ? (
                          <button
                            type="button"
                            className="rounded p-1 text-ink-400 hover:bg-mist-100 hover:text-ink-600"
                            aria-label="Reply"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReply(message);
                            }}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Mobile: action bar appears on tap */}
                    {showActions ? (
                      <div
                        className="mt-2 flex items-center justify-between gap-2 border-t border-mist-100 pt-2 sm:hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Reaction picker */}
                        {canReact ? (
                          <div className="flex items-center gap-1">
                            {REACTION_EMOJIS.slice(0, 6).map((emoji) => (
                              <button
                                key={`quick-${message.id}-${emoji}`}
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-mist-100"
                                onClick={() => {
                                  onToggleReaction?.(message.id, emoji);
                                  setSelectedMessageId(null);
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div />
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 text-xs font-medium">
                          {canReply ? (
                            <button
                              type="button"
                              className="text-ink-600 hover:text-ink-900"
                              onClick={() => {
                                onReply(message);
                                setSelectedMessageId(null);
                              }}
                            >
                              Reply
                            </button>
                          ) : null}
                          {canModify ? (
                            <button
                              type="button"
                              className="text-ink-600 hover:text-ink-900"
                              onClick={() => {
                                onEdit(message);
                                setSelectedMessageId(null);
                              }}
                            >
                              Edit
                            </button>
                          ) : null}
                          {canModerate && !isDeleted ? (
                            <button
                              type="button"
                              className="text-ink-600 hover:text-ink-900"
                              onClick={() => {
                                onPin(message.id);
                                setSelectedMessageId(null);
                              }}
                            >
                              Pin
                            </button>
                          ) : null}
                          {canModify ? (
                            <button
                              type="button"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => {
                                onDelete(message.id);
                                setSelectedMessageId(null);
                              }}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {/* Desktop: reaction menu popup */}
                    {isReactionMenuOpen ? (
                      <div
                        className="absolute right-0 top-0 z-20 hidden rounded-lg border border-mist-200 bg-white p-2 shadow-lg sm:block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={`menu-${message.id}-${emoji}`}
                              type="button"
                              className="flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-mist-100"
                              onClick={() => {
                                onToggleReaction?.(message.id, emoji);
                                setOpenReactionMessageId(null);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-2 border-t border-mist-100 pt-2 text-xs font-medium">
                          {canReply ? (
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-ink-600 hover:bg-mist-50"
                              onClick={() => {
                                onReply(message);
                                setOpenReactionMessageId(null);
                              }}
                            >
                              Reply
                            </button>
                          ) : null}
                          {canModify ? (
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-ink-600 hover:bg-mist-50"
                              onClick={() => {
                                onEdit(message);
                                setOpenReactionMessageId(null);
                              }}
                            >
                              Edit
                            </button>
                          ) : null}
                          {canModerate && !isDeleted ? (
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-ink-600 hover:bg-mist-50"
                              onClick={() => {
                                onPin(message.id);
                                setOpenReactionMessageId(null);
                              }}
                            >
                              Pin
                            </button>
                          ) : null}
                          {canModify ? (
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-rose-600 hover:bg-rose-50"
                              onClick={() => {
                                onDelete(message.id);
                                setOpenReactionMessageId(null);
                              }}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
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
