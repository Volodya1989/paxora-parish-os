"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChannelList from "@/components/chat/ChannelList";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatThread from "@/components/chat/ChatThread";
import ChatFontSizeControl from "@/components/chat/ChatFontSizeControl";
import Composer from "@/components/chat/Composer";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import type {
  ChatChannelMember,
  ChatChannelSummary,
  ChatMessage,
  ChatPinnedMessage
} from "@/components/chat/types";
import {
  addMember,
  createPoll,
  deleteMessage,
  editMessage,
  lockChannel,
  markRoomRead,
  pinMessage,
  postMessage,
  removeMember,
  toggleReaction,
  unlockChannel,
  unpinMessage,
  votePoll
} from "@/server/actions/chat";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";
import { useTranslations } from "@/lib/i18n/provider";
import { useChatFontSize } from "@/lib/chat/useChatFontSize";

function sortMessages(items: ChatMessage[]) {
  return [...items].sort((a, b) => {
    const diff = a.createdAt.getTime() - b.createdAt.getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

function parseMessage(message: any): ChatMessage {
  const parentMessage = message.parentMessage
    ? {
        ...message.parentMessage,
        createdAt: new Date(message.parentMessage.createdAt),
        deletedAt: message.parentMessage.deletedAt
          ? new Date(message.parentMessage.deletedAt)
          : null
      }
    : null;

  return {
    ...message,
    createdAt: new Date(message.createdAt),
    deletedAt: message.deletedAt ? new Date(message.deletedAt) : null,
    editedAt: message.editedAt ? new Date(message.editedAt) : null,
    parentMessage,
    replyCount: message.replyCount ?? 0,
    reactions: message.reactions ?? [],
    attachments: message.attachments ?? [],
    mentionEntities: message.mentionEntities ?? []
  } as ChatMessage;
}

type ReadIndicatorSnapshot = {
  recipientCount: number;
  sortedRecipientReadAtMs: number[];
};

function parseReadIndicatorSnapshot(snapshot: any): ReadIndicatorSnapshot | null {
  if (!snapshot || !Array.isArray(snapshot.sortedRecipientReadAtMs)) {
    return null;
  }

  return {
    recipientCount:
      typeof snapshot.recipientCount === "number" ? snapshot.recipientCount : 0,
    sortedRecipientReadAtMs: snapshot.sortedRecipientReadAtMs
      .filter((value: unknown) => typeof value === "number")
      .sort((a: number, b: number) => a - b)
  };
}

function parsePinned(pinned: any): ChatPinnedMessage {
  return {
    ...pinned,
    pinnedAt: new Date(pinned.pinnedAt),
    message: parseMessage(pinned.message)
  } as ChatPinnedMessage;
}

export default function ChatView({
  channels,
  channel,
  initialMessages,
  initialPinnedMessage,
  canPost,
  canModerate,
  currentUserId,
  parishId,
  mentionableUsers,
  channelMembers,
  lastReadAt,
  initialReadIndicatorSnapshot
}: {
  channels: ChatChannelSummary[];
  channel: ChatChannelSummary;
  initialMessages: ChatMessage[];
  initialPinnedMessage: ChatPinnedMessage | null;
  canPost: boolean;
  canModerate: boolean;
  currentUserId: string;
  parishId: string;
  mentionableUsers?: { id: string; name: string; email: string; avatarUrl?: string | null }[];
  channelMembers?: ChatChannelMember[];
  lastReadAt?: Date | null;
  initialReadIndicatorSnapshot?: ReadIndicatorSnapshot | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    sortMessages(initialMessages.map(parseMessage))
  );
  const [pinnedMessageState, setPinnedMessageState] = useState<ChatPinnedMessage | null>(() =>
    initialPinnedMessage ? parsePinned(initialPinnedMessage) : null
  );
  const [lockedAt, setLockedAt] = useState<Date | null>(() =>
    channel.lockedAt ? new Date(channel.lockedAt) : null
  );
  const [members, setMembers] = useState<ChatChannelMember[]>(channelMembers ?? []);
  const [readIndicatorSnapshot, setReadIndicatorSnapshot] = useState<ReadIndicatorSnapshot | null>(
    initialReadIndicatorSnapshot ? parseReadIndicatorSnapshot(initialReadIndicatorSnapshot) : null
  );
  const [membersOpen, setMembersOpen] = useState(false);
  const [isPollingReady, setIsPollingReady] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(initialMessages.length >= 50);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [threadRoot, setThreadRoot] = useState<ChatMessage | null>(null);
  const [threadEditingMessage, setThreadEditingMessage] = useState<ChatMessage | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const t = useTranslations();

  const { fontSize, increase, decrease, min, max } = useChatFontSize({
    userId: currentUserId,
    parishId
  });

  const headerFontSizeControl = (
    <ChatFontSizeControl
      fontSize={fontSize}
      min={min}
      max={max}
      onDecrease={decrease}
      onIncrease={increase}
      tone="light"
    />
  );

  const sheetFontSizeControl = (
    <ChatFontSizeControl
      fontSize={fontSize}
      min={min}
      max={max}
      onDecrease={decrease}
      onIncrease={increase}
      tone="dark"
    />
  );

  const messagesRef = useRef(messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);
  const justSentRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback((instant?: boolean) => {
    requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: instant ? "instant" : "smooth"
        });
      }
    });
  }, []);

  // Instant scroll to bottom on mount and channel change
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [channel.id]);

  // Track whether user is near the bottom of the message list
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      isNearBottomRef.current =
        container.scrollHeight - (container.scrollTop + container.clientHeight) < 150;
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll when new messages arrive:
  // - Always scroll after the user sends a message (justSentRef)
  // - For incoming messages (poll), only scroll if user is already near bottom
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      if (justSentRef.current || isNearBottomRef.current) {
        scrollToBottom();
      }
      justSentRef.current = false;
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  const markRoomReadAndRefresh = useCallback(async () => {
    await markRoomRead(channel.id);
    window.dispatchEvent(new Event("notifications:refresh"));
  }, [channel.id]);

  const poll = useCallback(async () => {
    const lastMessage = messagesRef.current[messagesRef.current.length - 1];
    const cursorQuery = lastMessage ? `?cursor=${lastMessage.id}` : "";

    try {
      const response = await fetch(`/api/chat/${channel.id}/poll${cursorQuery}`);
      if (!response.ok) return;

      const data = await response.json();
      const incoming = (data.messages ?? []).map(parseMessage) as ChatMessage[];

      if (incoming.length > 0) {
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          const replyIncrements = new Map<string, number>();

          for (const msg of incoming) {
            if (!existing.has(msg.id)) {
              merged.push(msg);
              if (msg.parentMessage) {
                replyIncrements.set(
                  msg.parentMessage.id,
                  (replyIncrements.get(msg.parentMessage.id) ?? 0) + 1
                );
              }
            }
          }

          const next = replyIncrements.size
            ? merged.map((message) =>
                replyIncrements.has(message.id)
                  ? {
                      ...message,
                      replyCount: Math.max(
                        0,
                        message.replyCount + (replyIncrements.get(message.id) ?? 0)
                      )
                    }
                  : message
              )
            : merged;

          return sortMessages(next);
        });
        void markRoomReadAndRefresh();
      }

      setPinnedMessageState(data.pinnedMessage ? parsePinned(data.pinnedMessage) : null);
      setLockedAt(data.lockedAt ? new Date(data.lockedAt) : null);
      setReadIndicatorSnapshot(parseReadIndicatorSnapshot(data.readIndicatorSnapshot));
    } finally {
      setIsPollingReady(true);
    }
  }, [channel.id, markRoomReadAndRefresh]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) return;
      await poll();
    };

    run();
    const interval = window.setInterval(run, 3000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [poll]);

  useEffect(() => {
    void markRoomReadAndRefresh();
  }, [markRoomReadAndRefresh]);

  useEffect(() => {
    setEditingMessage(null);
    setThreadRoot(null);
    setThreadEditingMessage(null);
    setHasOlderMessages(initialMessages.length >= 50);
    setReadIndicatorSnapshot(
      initialReadIndicatorSnapshot ? parseReadIndicatorSnapshot(initialReadIndicatorSnapshot) : null
    );
  }, [channel.id, initialMessages.length, initialReadIndicatorSnapshot]);

  useEffect(() => {
    if (!threadRoot) {
      setThreadEditingMessage(null);
    }
  }, [threadRoot]);

  const loadOlderMessages = useCallback(async () => {
    const oldest = messagesRef.current[0];
    if (!oldest || isLoadingOlder) {
      return;
    }

    setIsLoadingOlder(true);

    try {
      const response = await fetch(`/api/chat/${channel.id}/history?before=${oldest.id}`);
      if (!response.ok) {
        throw new Error("Unable to load history");
      }

      const data = await response.json();
      const incoming = (data.messages ?? []).map(parseMessage) as ChatMessage[];

      setMessages((prev) => {
        const existing = new Set(prev.map((message) => message.id));
        const fresh = incoming.filter((message) => !existing.has(message.id));
        return sortMessages([...fresh, ...prev]);
      });

      setHasOlderMessages(Boolean(data.hasMore));
    } catch {
      addToast({ title: t("chat.loadOlderError"), status: "error" });
    } finally {
      setIsLoadingOlder(false);
    }
  }, [addToast, channel.id, isLoadingOlder, t]);

  const uploadAttachments = async (files: File[]) => {
    if (files.length === 0) return [];

    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch(`/api/chat/${channel.id}/attachments`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.error ?? t("chat.uploadError"));
    }

    const data = await response.json();
    return data.attachments ?? [];
  };

  const handleSend = async (body: string, files: File[], mentionEntities: Array<{ userId: string; displayName: string; email: string; start: number; end: number }>) => {
    try {
      if (editingMessage) {
        if (files.length > 0) {
          addToast({
            title: t("chat.editingAttachmentsUnsupportedTitle"),
            description: t("chat.editingAttachmentsUnsupportedDescription"),
            status: "neutral"
          });
          return;
        }
        const updated = await editMessage(editingMessage.id, body);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === updated.id
              ? {
                  ...message,
                  ...parseMessage(updated),
                  reactions: message.reactions,
                  replyCount: message.replyCount
                }
              : message
          )
        );
        setEditingMessage(null);
        return;
      }

      const attachments = await uploadAttachments(files);
      const created = await postMessage(channel.id, body, { attachments, mentionEntities });
      justSentRef.current = true;
      setMessages((prev) => {
        const next = [...prev, parseMessage(created)];
        return sortMessages(next);
      });
    } catch (error) {
      addToast({
        title: t("chat.sendMessageErrorTitle"),
        description: error instanceof Error ? error.message : t("common.tryAgain"),
        status: "neutral"
      });
    }
  };

  const handleSendThread = async (body: string, files: File[], mentionEntities: Array<{ userId: string; displayName: string; email: string; start: number; end: number }>) => {
    if (!threadRoot) return;
    try {
      if (threadEditingMessage) {
        if (files.length > 0) {
          addToast({
            title: t("chat.editingAttachmentsUnsupportedTitle"),
            description: t("chat.editingAttachmentsUnsupportedDescription"),
            status: "neutral"
          });
          return;
        }
        const updated = await editMessage(threadEditingMessage.id, body);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === updated.id
              ? {
                  ...message,
                  ...parseMessage(updated),
                  reactions: message.reactions,
                  replyCount: message.replyCount
                }
              : message
          )
        );
        setThreadEditingMessage(null);
        return;
      }

      const attachments = await uploadAttachments(files);
      const created = await postMessage(channel.id, body, {
        parentMessageId: threadRoot.id,
        attachments,
        mentionEntities
      });
      setMessages((prev) => {
        const next = [...prev, parseMessage(created)];
        return sortMessages(
          next.map((message) =>
            message.id === threadRoot.id
              ? { ...message, replyCount: Math.max(0, message.replyCount + 1) }
              : message
          )
        );
      });
    } catch (error) {
      addToast({
        title: t("chat.sendReplyErrorTitle"),
        description: error instanceof Error ? error.message : t("common.tryAgain"),
        status: "neutral"
      });
    }
  };

  const handleDelete = async (messageId: string) => {
    await deleteMessage(messageId);
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, deletedAt: new Date() } : message
      )
    );
    if (editingMessage?.id === messageId) {
      setEditingMessage(null);
    }
    if (threadEditingMessage?.id === messageId) {
      setThreadEditingMessage(null);
    }
    if (threadRoot?.id === messageId) {
      setThreadRoot(null);
    }
  };

  const handlePin = async (messageId: string) => {
    await pinMessage(messageId);
    await poll();
  };

  const handleUnpin = async () => {
    await unpinMessage(channel.id);
    setPinnedMessageState(null);
  };

  const handleToggleLock = async () => {
    if (lockedAt) {
      await unlockChannel(channel.id);
      setLockedAt(null);
      return;
    }
    await lockChannel(channel.id);
    setLockedAt(new Date());
  };

  const showMemberManagement = canModerate && channel.type !== "GROUP";

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.isMember !== b.isMember) return a.isMember ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [members]
  );

  const handleMemberToggle = async (member: ChatChannelMember) => {
    if (member.isMember) {
      await removeMember(channel.id, member.userId);
    } else {
      await addMember(channel.id, member.userId);
    }

    setMembers((prev) =>
      prev.map((item) =>
        item.userId === member.userId ? { ...item, isMember: !member.isMember } : item
      )
    );
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const snapshot = messagesRef.current;
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId) return message;
        const reactions = message.reactions ?? [];
        const existing = reactions.find((reaction) => reaction.emoji === emoji);
        if (existing) {
          const nextCount = existing.reactedByMe ? existing.count - 1 : existing.count + 1;
          const updated = reactions
            .map((reaction) =>
              reaction.emoji === emoji
                ? {
                    ...reaction,
                    count: nextCount,
                    reactedByMe: !reaction.reactedByMe
                  }
                : reaction
            )
            .filter((reaction) => reaction.count > 0);
          return {
            ...message,
            reactions: updated
          };
        }
        return {
          ...message,
          reactions: [
            ...reactions,
            {
              emoji,
              count: 1,
              reactedByMe: true
            }
          ]
        };
      })
    );

    try {
      const updated = await toggleReaction(messageId, emoji);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, reactions: updated.reactions } : message
        )
      );
    } catch (error) {
      setMessages(snapshot);
    }
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    const created = await createPoll(channel.id, question, options);
    justSentRef.current = true;
    setMessages((prev) => {
      const next = [...prev, parseMessage(created)];
      return sortMessages(next);
    });
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    const updated = await votePoll(pollId, optionId);
    // Update the poll data on the corresponding message
    setMessages((prev) =>
      prev.map((message) => {
        if (message.poll?.id !== pollId) return message;
        return {
          ...message,
          poll: updated
        };
      })
    );
  };

  const channelMessages = useMemo(
    () => messages.filter((message) => !message.parentMessage),
    [messages]
  );

  const firstUnreadMessageId = useMemo(() => {
    if (!lastReadAt) return null;
    const threshold = new Date(lastReadAt).getTime();
    const unread = channelMessages.find(
      (message) =>
        message.author.id !== currentUserId &&
        new Date(message.createdAt).getTime() > threshold
    );
    return unread?.id ?? null;
  }, [channelMessages, lastReadAt, currentUserId]);


  const highlightedMessageId = searchParams.get("msg");


  useEffect(() => {
    if (!highlightedMessageId) return;
    if (messages.some((message) => message.id === highlightedMessageId)) return;

    const loadTarget = async () => {
      const response = await fetch(`/api/chat/${channel.id}/poll?msg=${highlightedMessageId}`);
      if (!response.ok) return;
      const data = await response.json();
      const incoming = (data.messages ?? []).map(parseMessage);
      setMessages((prev) => sortMessages([...prev, ...incoming.filter((msg: ChatMessage) => !prev.some((cur) => cur.id === msg.id))]));
    };

    void loadTarget();
  }, [channel.id, highlightedMessageId, messages]);

  useEffect(() => {
    if (!highlightedMessageId) return;
    const node = document.querySelector(`[data-chat-message-id="${highlightedMessageId}"]`) as HTMLElement | null;
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (isPollingReady) {
      addToast({ title: "Mention target no longer exists", status: "neutral" });
    }
  }, [addToast, highlightedMessageId, isPollingReady, messages.length]);

  const threadMessages = useMemo(() => {
    if (!threadRoot) return [];
    const root = messages.find((message) => message.id === threadRoot.id) ?? threadRoot;
    const replies = messages.filter((message) => message.parentMessage?.id === root.id);
    return sortMessages([root, ...replies]);
  }, [messages, threadRoot]);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden space-y-4 lg:block">
        <ChannelList channels={channels} activeChannelId={channel.id} />
      </aside>
      <section className="flex flex-col fixed inset-0 z-40 bg-mist-50 touch-manipulation animate-chat-fade-in md:relative md:z-auto md:h-[calc(100dvh-6rem)] md:max-h-[calc(100dvh-6rem)] md:rounded-card overflow-hidden">
        {/* Stationary background layer — does not scroll with messages */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: "url('/chat-background.png')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 z-0 bg-emerald-50/30 pointer-events-none" aria-hidden="true" />
        <div className="shrink-0 relative z-10">
          <ChatHeader
            channel={{ ...channel, lockedAt }}
            channels={channels}
            canModerate={canModerate}
            onToggleLock={handleToggleLock}
            onManageMembers={showMemberManagement ? () => setMembersOpen(true) : undefined}
            chatFontSizeControl={headerFontSizeControl}
            onChannelChange={(channelId) => {
              const selected = channels.find((item) => item.id === channelId);
              if (selected?.type === "GROUP" && selected.group) {
                router.push(`/groups/${selected.group.id}/chat`);
                return;
              }
              router.push(`/community/chat?channel=${channelId}`);
            }}
          />
        </div>
        <div ref={scrollContainerRef} className="relative z-10 flex-1 overflow-y-auto overscroll-contain py-2 scroll-smooth">
          {hasOlderMessages ? (
            <div className="mb-2 flex justify-center px-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={isLoadingOlder}
                onClick={() => {
                  void loadOlderMessages();
                }}
              >
                {isLoadingOlder ? t("chat.loadingOlder") : t("chat.loadOlder")}
              </Button>
            </div>
          ) : null}
          <ChatThread
            messages={channelMessages}
            pinnedMessage={pinnedMessageState}
            canModerate={canModerate}
            currentUserId={currentUserId}
            onReply={(message) => {
              if (message.deletedAt) return;
              setEditingMessage(null);
              setThreadEditingMessage(null);
              setThreadRoot(message);
            }}
            onEdit={(message) => {
              if (message.deletedAt) return;
              setEditingMessage(message);
            }}
            onPin={handlePin}
            onUnpin={handleUnpin}
            onDelete={handleDelete}
            onToggleReaction={handleToggleReaction}
            onViewThread={(message) => {
              setThreadEditingMessage(null);
              setThreadRoot(message);
            }}
            onVotePoll={handleVotePoll}
            isLoading={!isPollingReady}
            firstUnreadMessageId={firstUnreadMessageId}
            highlightedMessageId={highlightedMessageId}
            messageFontSize={fontSize}
            readIndicatorSnapshot={readIndicatorSnapshot}
          />
          <div ref={bottomRef} aria-hidden="true" />
        </div>
        <div className="shrink-0 relative z-10">
          <Composer
            disabled={!canPost || Boolean(lockedAt)}
            onSend={handleSend}
            editingMessage={
              editingMessage
                ? {
                    id: editingMessage.id,
                    body: editingMessage.body
                  }
                : null
            }
            onCancelEdit={() => setEditingMessage(null)}
            mentionableUsers={mentionableUsers}
            onCreatePoll={canPost && !lockedAt ? handleCreatePoll : undefined}
          />
        </div>
      </section>

      {threadRoot ? (
        <>
          {isDesktop ? (
            <Modal
              open={Boolean(threadRoot)}
              onClose={() => setThreadRoot(null)}
              title={`Thread (${threadRoot.replyCount})`}
              headerActions={sheetFontSizeControl}
            >
              <div className="space-y-4">
                <ChatThread
                  messages={threadMessages}
                  pinnedMessage={null}
                  canModerate={canModerate}
                  currentUserId={currentUserId}
                  onReply={() => undefined}
                  onEdit={(message) => {
                    if (message.deletedAt) return;
                    setEditingMessage(null);
                    setThreadEditingMessage(message);
                  }}
                  onPin={handlePin}
                  onUnpin={handleUnpin}
                  onDelete={handleDelete}
                  onToggleReaction={handleToggleReaction}
                  isLoading={false}
                  highlightedMessageId={highlightedMessageId}
                  messageFontSize={fontSize}
                  readIndicatorSnapshot={null}
                />
                <Composer
                  disabled={!canPost || Boolean(lockedAt)}
                  onSend={handleSendThread}
                  editingMessage={
                    threadEditingMessage
                      ? {
                          id: threadEditingMessage.id,
                          body: threadEditingMessage.body
                        }
                      : null
                  }
                  onCancelEdit={() => setThreadEditingMessage(null)}
                  replyTo={
                    threadRoot
                      ? {
                          id: threadRoot.id,
                          authorName: threadRoot.author.name,
                          body: threadRoot.body,
                          deletedAt: threadRoot.deletedAt
                        }
                      : null
                  }
                  onCancelReply={() => setThreadRoot(null)}
                  mentionableUsers={mentionableUsers}
                />
              </div>
            </Modal>
          ) : (
            <Drawer
              open={Boolean(threadRoot)}
              onClose={() => setThreadRoot(null)}
              title={`Thread (${threadRoot.replyCount})`}
              headerActions={sheetFontSizeControl}
              footer={
                <div className="w-full">
                  <Composer
                    disabled={!canPost || Boolean(lockedAt)}
                    onSend={handleSendThread}
                    editingMessage={
                      threadEditingMessage
                        ? {
                            id: threadEditingMessage.id,
                            body: threadEditingMessage.body
                          }
                        : null
                    }
                    onCancelEdit={() => setThreadEditingMessage(null)}
                    replyTo={
                      threadRoot
                        ? {
                            id: threadRoot.id,
                            authorName: threadRoot.author.name,
                            body: threadRoot.body,
                            deletedAt: threadRoot.deletedAt
                          }
                        : null
                    }
                    onCancelReply={() => setThreadRoot(null)}
                    mentionableUsers={mentionableUsers}
                  />
                </div>
              }
            >
              <ChatThread
                messages={threadMessages}
                pinnedMessage={null}
                canModerate={canModerate}
                currentUserId={currentUserId}
                onReply={() => undefined}
                onEdit={(message) => {
                  if (message.deletedAt) return;
                  setEditingMessage(null);
                  setThreadEditingMessage(message);
                }}
                onPin={handlePin}
                onUnpin={handleUnpin}
                onDelete={handleDelete}
                onToggleReaction={handleToggleReaction}
                isLoading={false}
                highlightedMessageId={highlightedMessageId}
                messageFontSize={fontSize}
                readIndicatorSnapshot={null}
              />
            </Drawer>
          )}
        </>
      ) : null}

      {showMemberManagement ? (
        <Modal
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          title="Manage channel members"
          footer={
            <Button type="button" variant="secondary" size="sm" onClick={() => setMembersOpen(false)}>
              Done
            </Button>
          }
        >
          <div className="space-y-3">
            {sortedMembers.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-3 rounded-card border border-mist-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{member.name}</p>
                  <p className="text-xs text-ink-400">{member.email}</p>
                </div>
                <Button
                  type="button"
                  variant={member.isMember ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => handleMemberToggle(member)}
                >
                  {member.isMember ? "Remove" : "Add"}
                </Button>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
