"use client";

import Link from "next/link";
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
    <div className="space-y-4">
      <section className="space-y-1">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Parish</p>
        <div className="space-y-0.5">
          {parishChannels.map((channel) => {
            const isActive = channel.id === activeChannelId;
            return (
              <Link
                key={channel.id}
                href={channelHref(channel)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition",
                  isActive
                    ? "bg-emerald-50 text-emerald-900"
                    : "text-ink-700 hover:bg-mist-50"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isActive ? "bg-emerald-200 text-emerald-800" : "bg-mist-100 text-ink-600"
                )}>
                  {channel.type === "ANNOUNCEMENT" ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  ) : (
                    getInitials(channel.name) || "#"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{channelLabel(channel)}</span>
                    {channel.lockedAt ? (
                      <svg className="h-3.5 w-3.5 shrink-0 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : null}
                  </div>
                  {channel.description ? (
                    <p className="truncate text-xs text-ink-400">{channel.description}</p>
                  ) : null}
                </div>
                {channel.unreadCount ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white">
                    {channel.unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-1">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Groups</p>
        <div className="space-y-0.5">
          {groupChannels.length === 0 ? (
            <p className="px-2 py-2 text-xs text-ink-400">No group rooms yet.</p>
          ) : (
            groupChannels.map((channel) => {
              const isActive = channel.id === activeChannelId;
              const name = channel.group?.name ?? channel.name;
              return (
                <Link
                  key={channel.id}
                  href={channelHref(channel)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition",
                    isActive
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-ink-700 hover:bg-mist-50"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isActive ? "bg-emerald-200 text-emerald-800" : "bg-mist-100 text-ink-600"
                  )}>
                    {getInitials(name) || "GR"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{name}</span>
                      {channel.lockedAt ? (
                        <svg className="h-3.5 w-3.5 shrink-0 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : null}
                    </div>
                    {channel.description ? (
                      <p className="truncate text-xs text-ink-400">{channel.description}</p>
                    ) : null}
                  </div>
                  {channel.unreadCount ? (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white">
                      {channel.unreadCount}
                    </span>
                  ) : null}
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
