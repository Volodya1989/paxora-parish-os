"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/ui/cn";
import type { ChatChannelSummary } from "@/components/chat/types";

const COMMUNITY_CHAT_ROUTE = "/community/chat";

function channelHref(channel: ChatChannelSummary) {
  if (channel.type === "GROUP" && channel.group) {
    return `/groups/${channel.group.id}/chat`;
  }

  return `${COMMUNITY_CHAT_ROUTE}?channel=${channel.id}`;
}

function channelLabel(channel: ChatChannelSummary) {
  if (channel.type === "ANNOUNCEMENT") {
    return "Announcements";
  }

  return channel.name;
}

export default function ChannelList({
  channels,
  activeChannelId
}: {
  channels: ChatChannelSummary[];
  activeChannelId: string;
}) {
  const parishChannels = channels.filter((channel) => channel.type !== "GROUP");
  const groupChannels = channels.filter((channel) => channel.type === "GROUP");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Parish</p>
        <div className="space-y-2">
          {parishChannels.map((channel) => {
            const isActive = channel.id === activeChannelId;
            return (
              <Link
                key={channel.id}
                href={channelHref(channel)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-card border px-3 py-2 text-sm transition",
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-mist-100 bg-white text-ink-700 hover:border-mist-200"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{channelLabel(channel)}</span>
                    {channel.lockedAt ? (
                      <span className="text-xs text-ink-400" aria-label="Channel locked">
                        🔒
                      </span>
                    ) : null}
                  </div>
                  {channel.description ? (
                    <p className="text-xs text-ink-400">{channel.description}</p>
                  ) : null}
                </div>
                {channel.unreadCount ? <Badge tone="warning">{channel.unreadCount}</Badge> : null}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Groups</p>
        <div className="space-y-2">
          {groupChannels.length === 0 ? (
            <p className="text-xs text-ink-400">No group rooms yet.</p>
          ) : (
            groupChannels.map((channel) => {
              const isActive = channel.id === activeChannelId;
              return (
                <Link
                  key={channel.id}
                  href={channelHref(channel)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-card border px-3 py-2 text-sm transition",
                    isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-mist-100 bg-white text-ink-700 hover:border-mist-200"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{channel.group?.name ?? channel.name}</span>
                      {channel.lockedAt ? (
                        <span className="text-xs text-ink-400" aria-label="Channel locked">
                          🔒
                        </span>
                      ) : null}
                    </div>
                    {channel.description ? (
                      <p className="text-xs text-ink-400">{channel.description}</p>
                    ) : null}
                  </div>
                  {channel.unreadCount ? <Badge tone="warning">{channel.unreadCount}</Badge> : null}
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
