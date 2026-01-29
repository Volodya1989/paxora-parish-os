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
    <div className="space-y-2 border-b border-mist-100 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className={showSwitcher ? "hidden sm:block" : undefined}>
          <h2 className="text-h3 text-ink-900">{channel.name}</h2>
          {channel.description ? (
            <p className="text-sm text-ink-500">{channel.description}</p>
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
      <div className="flex flex-wrap items-center gap-2">
        {channel.type === "ANNOUNCEMENT" ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            Announcement
          </span>
        ) : null}
        {channel.lockedAt ? (
          <span className="rounded-full bg-mist-100 px-2.5 py-1 text-xs font-semibold text-ink-600">
            Locked
          </span>
        ) : null}
      </div>
    </div>
  );
}
