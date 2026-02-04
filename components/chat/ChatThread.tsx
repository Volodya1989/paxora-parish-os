"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ListSkeleton from "@/components/app/list-skeleton";
import ChatPollCard from "@/components/chat/ChatPollCard";
import PinnedBanner from "@/components/chat/PinnedBanner";
import type { ChatMessage, ChatPinnedMessage } from "@/components/chat/types";
import { REACTION_EMOJIS } from "@/lib/chat/reactions";
import { cn } from "@/lib/ui/cn";

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const GROUP_WINDOW_MS = 2 * 60 * 1000;
const LONG_PRESS_MS = 500;
const SWIPE_THRESHOLD = 60;
const SWIPE_MAX = 80;
const DIRECTION_LOCK_DELTA = 10;

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

function isSameGroup(prev: ChatMessage | null, current: ChatMessage): boolean {
  if (!prev) return false;
  if (prev.author.id !== current.author.id) return false;
  if (prev.deletedAt) return false;
  const diff = Math.abs(
    new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime()
  );
  return diff <= GROUP_WINDOW_MS;
}

/** Hook for long-press detection on both touch and mouse */
function useLongPress(onLongPress: () => void, onTap?: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const movedRef = useRef(false);

  const start = useCallback(() => {
    firedRef.current = false;
    movedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }, [onLongPress]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback(() => {
    cancel();
    if (!firedRef.current && !movedRef.current && onTap) {
      onTap();
    }
  }, [cancel, onTap]);

  const move = useCallback(() => {
    movedRef.current = true;
    cancel();
  }, [cancel]);

  return {
    onTouchStart: start,
    onTouchEnd: end,
    onTouchMove: move,
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel
  };
}

/** Hook for swipe-right-to-reply gesture (Telegram/WhatsApp pattern) */
function useSwipeToReply(onReply: () => void, enabled: boolean) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const directionRef = useRef<"horizontal" | "vertical" | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled) return;
      const touch = event.touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      currentXRef.current = touch.clientX;
      directionRef.current = null;
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled) return;
      const touch = event.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      // Lock direction after a small movement threshold
      if (directionRef.current === null) {
        if (Math.abs(deltaX) > DIRECTION_LOCK_DELTA || Math.abs(deltaY) > DIRECTION_LOCK_DELTA) {
          directionRef.current =
            Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        }
        return;
      }

      if (directionRef.current === "vertical") return;

      // Only allow rightward swipe, clamped to max
      const clamped = Math.max(0, Math.min(deltaX, SWIPE_MAX));
      currentXRef.current = touch.clientX;
      setOffsetX(clamped);
    },
    [enabled]
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled) return;
    if (directionRef.current === "horizontal" && offsetX >= SWIPE_THRESHOLD) {
      onReply();
    }
    directionRef.current = null;
    setOffsetX(0);
  }, [enabled, offsetX, onReply]);

  return {
    offsetX,
    isActive: directionRef.current === "horizontal" && offsetX > 0,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd
    }
  };
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
  onVotePoll,
  initialReactionMenuMessageId,
  isLoading,
  firstUnreadMessageId
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
  onVotePoll?: (pollId: string, optionId: string) => Promise<void> | void;
  initialReactionMenuMessageId?: string | null;
  isLoading?: boolean;
  firstUnreadMessageId?: string | null;
}) {
  const [contextMenuMessageId, setContextMenuMessageId] = useState<string | null>(
    initialReactionMenuMessageId ?? null
  );

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

  let unreadRendered = false;

  return (
    <div
      className="rounded-card border border-mist-100 bg-gradient-to-b from-mist-50/70 via-white to-mist-50/40 p-3 shadow-sm touch-manipulation"
      onClick={() => {
        if (contextMenuMessageId !== null) {
          setContextMenuMessageId(null);
        }
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
              {group.messages.map((message, messageIndex) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  previousMessage={messageIndex > 0 ? group.messages[messageIndex - 1] : null}
                  isMine={Boolean(currentUserId && message.author.id === currentUserId)}
                  currentUserId={currentUserId}
                  canModerate={canModerate}
                  contextMenuOpen={contextMenuMessageId === message.id}
                  onOpenContextMenu={() => setContextMenuMessageId(message.id)}
                  onCloseContextMenu={() => setContextMenuMessageId(null)}
                  onReply={onReply}
                  onEdit={onEdit}
                  onPin={onPin}
                  onDelete={onDelete}
                  onToggleReaction={onToggleReaction}
                  onViewThread={onViewThread}
                  onVotePoll={onVotePoll}
                  firstUnreadMessageId={firstUnreadMessageId}
                  showUnreadSeparator={(() => {
                    if (firstUnreadMessageId && !unreadRendered && message.id === firstUnreadMessageId) {
                      unreadRendered = true;
                      return true;
                    }
                    return false;
                  })()}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Individual message row — extracted so we can use the long-press hook per message */
function MessageRow({
  message,
  previousMessage,
  isMine,
  currentUserId,
  canModerate,
  contextMenuOpen,
  onOpenContextMenu,
  onCloseContextMenu,
  onReply,
  onEdit,
  onPin,
  onDelete,
  onToggleReaction,
  onViewThread,
  onVotePoll,
  firstUnreadMessageId,
  showUnreadSeparator
}: {
  message: ChatMessage;
  previousMessage: ChatMessage | null;
  isMine: boolean;
  currentUserId?: string;
  canModerate: boolean;
  contextMenuOpen: boolean;
  onOpenContextMenu: () => void;
  onCloseContextMenu: () => void;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onPin: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onViewThread?: (message: ChatMessage) => void;
  onVotePoll?: (pollId: string, optionId: string) => Promise<void> | void;
  firstUnreadMessageId?: string | null;
  showUnreadSeparator: boolean;
}) {
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
  const hasActions = canReply || canModify || canModerate || canReact;

  const isGrouped = isSameGroup(previousMessage, message);
  const showAuthorBlock = !isGrouped;

  const longPressHandlers = useLongPress(
    () => {
      if (hasActions) onOpenContextMenu();
    },
    () => {
      // Simple tap: toggle context menu on mobile, nothing on desktop
      if (hasActions) {
        if (contextMenuOpen) {
          onCloseContextMenu();
        }
      }
    }
  );

  const swipe = useSwipeToReply(
    () => {
      if (canReply) onReply(message);
    },
    canReply && !isDeleted
  );

  // Merge touch handlers: swipe takes precedence for movement tracking,
  // long-press fires on stationary hold
  const mergedTouchStart = (event: React.TouchEvent) => {
    swipe.handlers.onTouchStart(event);
    longPressHandlers.onTouchStart();
  };
  const mergedTouchMove = (event: React.TouchEvent) => {
    swipe.handlers.onTouchMove(event);
    longPressHandlers.onTouchMove();
  };
  const mergedTouchEnd = () => {
    swipe.handlers.onTouchEnd();
    longPressHandlers.onTouchEnd();
  };

  // Normalised swipe progress 0..1 for animations
  const swipeProgress = Math.min(swipe.offsetX / SWIPE_THRESHOLD, 1);

  return (
    <div>
      {/* Unread messages separator */}
      {showUnreadSeparator ? (
        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-rose-300" />
          <span className="shrink-0 rounded-full bg-rose-50 px-3 py-0.5 text-[11px] font-semibold text-rose-500">
            New messages
          </span>
          <div className="h-px flex-1 bg-rose-300" />
        </div>
      ) : null}

      <div
        className={cn(
          "group relative flex",
          isMine ? "justify-end" : "justify-start",
          isGrouped ? "mt-0.5" : "mt-3 first:mt-0"
        )}
      >
        {/* Swipe-to-reply indicator — appears behind the message as user swipes right */}
        {swipe.offsetX > 0 ? (
          <div
            className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center justify-center"
            style={{
              opacity: swipeProgress,
              transform: `translateY(-50%) scale(${0.5 + swipeProgress * 0.5})`
            }}
            aria-hidden="true"
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                swipeProgress >= 1
                  ? "bg-emerald-600 text-white"
                  : "bg-mist-200 text-ink-500"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        ) : null}
        {/* Left-side avatar for other users */}
        {!isMine ? (
          <div
            className="mr-2 w-9 shrink-0"
            style={swipe.offsetX > 0 ? { transform: `translateX(${swipe.offsetX}px)` } : undefined}
          >
            {showAuthorBlock ? (
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800"
                title={message.author.name}
                aria-label={`View profile for ${message.author.name}`}
              >
                <span aria-hidden="true">{initials}</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Bubble */}
        <div
          className={cn(
            "relative w-fit min-w-[60px] max-w-[75%] px-3 py-1.5 select-none",
            isMine
              ? "rounded-2xl rounded-br-sm bg-emerald-100"
              : "rounded-2xl rounded-bl-sm bg-gray-50 border border-gray-200",
            contextMenuOpen && "ring-1 ring-primary-200",
            swipe.offsetX > 0 && "transition-none"
          )}
          style={swipe.offsetX > 0 ? { transform: `translateX(${swipe.offsetX}px)` } : undefined}
          tabIndex={0}
          role="button"
          aria-label={`Message from ${message.author.name}`}
          aria-expanded={contextMenuOpen}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (hasActions) {
                if (contextMenuOpen) onCloseContextMenu();
                else onOpenContextMenu();
              }
            }
            if (event.key === "Escape" && contextMenuOpen) {
              onCloseContextMenu();
            }
          }}
          onTouchStart={mergedTouchStart}
          onTouchMove={mergedTouchMove}
          onTouchEnd={mergedTouchEnd}
          onMouseDown={longPressHandlers.onMouseDown}
          onMouseUp={longPressHandlers.onMouseUp}
          onMouseLeave={longPressHandlers.onMouseLeave}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onContextMenu={(event) => {
            // Prevent native context menu on long-press (mobile browsers)
            if (hasActions) {
              event.preventDefault();
            }
          }}
        >
          {/* Author + time header (first in group only) */}
          {showAuthorBlock ? (
            <div className="mb-0.5 flex items-center gap-2">
              {!isMine ? (
                <span className="text-xs font-bold text-ink-900">
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
              isDeleted
                ? "italic text-ink-400"
                : isMine
                  ? "text-ink-700"
                  : "text-ink-800"
            )}
          >
            {isDeleted ? "This message was deleted." : message.body}
          </p>

          {/* Poll card (rendered inside the bubble for poll messages) */}
          {!isDeleted && message.poll && onVotePoll ? (
            <ChatPollCard poll={message.poll} onVote={onVotePoll} />
          ) : null}

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

          {/* Existing reaction badges (always visible) */}
          {hasReactions ? (
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
            </div>
          ) : null}
        </div>

        {/* Context menu popover — WhatsApp/Telegram style */}
        {contextMenuOpen && hasActions ? (
          <>
            {/* Backdrop to close */}
            <div
              className="fixed inset-0 z-20"
              onClick={(event) => {
                event.stopPropagation();
                onCloseContextMenu();
              }}
            />
            <div
              className={cn(
                "absolute z-30 flex flex-col items-stretch overflow-hidden rounded-xl border border-mist-200 bg-white shadow-xl",
                isMine ? "right-0" : "left-11",
                "top-0"
              )}
              onClick={(event) => event.stopPropagation()}
            >
              {/* Emoji quick-react row */}
              {canReact ? (
                <div className="flex items-center gap-0.5 border-b border-mist-100 px-2 py-1.5">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={`ctx-${message.id}-${emoji}`}
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-mist-50 active:scale-110"
                      aria-label={`React with ${emoji}`}
                      onClick={() => {
                        onToggleReaction?.(message.id, emoji);
                        onCloseContextMenu();
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Vertical action buttons */}
              <div className="flex flex-col py-1">
                {canReply ? (
                  <button
                    type="button"
                    className="flex items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-700 active:bg-mist-50"
                    onClick={() => {
                      onReply(message);
                      onCloseContextMenu();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-ink-400" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
                    </svg>
                    Reply
                  </button>
                ) : null}
                {canModify ? (
                  <button
                    type="button"
                    className="flex items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-700 active:bg-mist-50"
                    onClick={() => {
                      onEdit(message);
                      onCloseContextMenu();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-ink-400" aria-hidden="true">
                      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                    </svg>
                    Edit
                  </button>
                ) : null}
                {canModerate && !isDeleted ? (
                  <button
                    type="button"
                    className="flex items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-700 active:bg-mist-50"
                    onClick={() => {
                      onPin(message.id);
                      onCloseContextMenu();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-ink-400" aria-hidden="true">
                      <path d="M8.5 3.528v4.644c0 .729-.29 1.428-.805 1.944l-1.217 1.216a8.75 8.75 0 013.55.621l.502.201a7.25 7.25 0 004.178.365l-2.403-2.403a2.75 2.75 0 01-.805-1.944V3.528a40.205 40.205 0 00-3 0zm-1 0a41.695 41.695 0 00-2.765.17A.75.75 0 004 4.432v.084c0 .258.104.505.29.69L5.5 6.415V8.172c0 .331-.132.649-.366.883l-2.3 2.3a.75.75 0 00.326 1.264 9.56 9.56 0 003.611.71H8.5v3.92a.75.75 0 001.5 0v-3.92h1.729a9.56 9.56 0 003.611-.71.75.75 0 00.326-1.264l-2.3-2.3a1.25 1.25 0 01-.366-.883V6.415l1.21-1.21a.975.975 0 00.29-.69v-.083a.75.75 0 00-.735-.734 41.695 41.695 0 00-5.265-.17z" />
                    </svg>
                    Pin
                  </button>
                ) : null}
                {canModify ? (
                  <button
                    type="button"
                    className="flex items-center gap-3 px-4 py-2.5 text-left text-sm text-rose-600 active:bg-rose-50"
                    onClick={() => {
                      onDelete(message.id);
                      onCloseContextMenu();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
