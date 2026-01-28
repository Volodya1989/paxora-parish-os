"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChannelList from "@/components/chat/ChannelList";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatThread from "@/components/chat/ChatThread";
import Composer from "@/components/chat/Composer";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type {
  ChatChannelMember,
  ChatChannelSummary,
  ChatMessage,
  ChatPinnedMessage
} from "@/components/chat/types";
import {
  addMember,
  deleteMessage,
  lockChannel,
  pinMessage,
  postMessage,
  removeMember,
  unlockChannel,
  unpinMessage
} from "@/server/actions/chat";

function sortMessages(items: ChatMessage[]) {
  return [...items].sort((a, b) => {
    const diff = a.createdAt.getTime() - b.createdAt.getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

function parseMessage(message: any): ChatMessage {
  return {
    ...message,
    createdAt: new Date(message.createdAt),
    deletedAt: message.deletedAt ? new Date(message.deletedAt) : null
  } as ChatMessage;
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
  channelMembers
}: {
  channels: ChatChannelSummary[];
  channel: ChatChannelSummary;
  initialMessages: ChatMessage[];
  initialPinnedMessage: ChatPinnedMessage | null;
  canPost: boolean;
  canModerate: boolean;
  channelMembers?: ChatChannelMember[];
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
  const [membersOpen, setMembersOpen] = useState(false);
  const [isPollingReady, setIsPollingReady] = useState(false);

  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
          for (const msg of incoming) {
            if (!existing.has(msg.id)) merged.push(msg);
          }
          return sortMessages(merged);
        });
      }

      setPinnedMessageState(data.pinnedMessage ? parsePinned(data.pinnedMessage) : null);
      setLockedAt(data.lockedAt ? new Date(data.lockedAt) : null);
    } finally {
      setIsPollingReady(true);
    }
  }, [channel.id]);

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

  const handleSend = async (body: string) => {
    const created = await postMessage(channel.id, body);
    setMessages((prev) => sortMessages([...prev, parseMessage(created)]));
  };

  const handleDelete = async (messageId: string) => {
    await deleteMessage(messageId);
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, deletedAt: new Date() } : message
      )
    );
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

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <ChannelList channels={channels} activeChannelId={channel.id} />
      </aside>
      <section className="space-y-4">
        <ChatHeader
          channel={{ ...channel, lockedAt }}
          canModerate={canModerate}
          onToggleLock={handleToggleLock}
          onManageMembers={showMemberManagement ? () => setMembersOpen(true) : undefined}
        />
        <ChatThread
          messages={messages}
          pinnedMessage={pinnedMessageState}
          canModerate={canModerate}
          onPin={handlePin}
          onUnpin={handleUnpin}
          onDelete={handleDelete}
          isLoading={!isPollingReady}
        />
        <Composer disabled={!canPost || Boolean(lockedAt)} onSend={handleSend} />
      </section>

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
