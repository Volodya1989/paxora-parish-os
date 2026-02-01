"use client";

import Button from "@/components/ui/Button";
import SelectMenu from "@/components/ui/SelectMenu";
import type { ChatChannelSummary } from "@/components/chat/types";
import { useMemo } from "react";

export default function ChatHeader({
  channel,
  channels,
  canModerate,
  onToggleLock,
  onManageMembers,
  onChannelChange
}: {
  channel: ChatChannelSummary;
  channels?: ChatChannelSummary[];
  canModerate: boolean;
  onToggleLock: () => void;
  onManageMembers?: () => void;
  onChannelChange?: (channelId: string) => void;
}) {
  const channelOptions = useMemo(() => {
    const items = channels ?? [];
    const nameCounts = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.name] = (acc[item.name] ?? 0) + 1;
      return acc;
    }, {});

    const typeLabel = (item: ChatChannelSummary) =>
      item.type === "GROUP"
        ? item.group?.name ?? "Group"
        : item.type === "PARISH"
          ? "Parish"
          : "Announcement";

    return items.map((item) => ({
      value: item.id,
      label: nameCounts[item.name] > 1 ? `${item.name} · ${typeLabel(item)}` : item.name
    }));
  }, [channels]);

  const showSwitcher = Boolean(channels && channels.length > 1 && onChannelChange);

  return (
    <div className="space-y-3">
      <div className="rounded-card bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-500 px-4 py-4 text-white shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className={showSwitcher ? "hidden sm:block" : undefined}>
            <h2 className="text-lg font-bold text-white sm:text-xl">{channel.name}</h2>
            {channel.description ? (
              <p className="mt-1 text-sm text-white/80">{channel.description}</p>
            ) : null}
          </div>
          {canModerate ? (
            <div className="flex flex-wrap items-center gap-2">
              {onManageMembers ? (
                <Button type="button" variant="secondary" size="sm" onClick={onManageMembers}>
                  Manage members
                </Button>
              ) : null}
              <Button type="button" variant="secondary" size="sm" onClick={onToggleLock}>
                {channel.lockedAt ? "Unlock" : "Lock"}
              </Button>
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {channel.type === "ANNOUNCEMENT" ? (
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
              Announcement
            </span>
          ) : null}
          {channel.lockedAt ? (
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
              Locked
            </span>
          ) : null}
        </div>
      </div>
      {showSwitcher ? (
        <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
          <h2 className="text-h3 text-ink-900 sm:hidden">{channel.name}</h2>
          <div className="max-w-xs">
            <SelectMenu
            name="channel"
            value={channel.id}
            onValueChange={(value) => onChannelChange?.(value)}
            options={channelOptions}
            aria-label="Switch chat"
          />
          </div>
        </div>
      ) : null}
    </div>
  );
}
