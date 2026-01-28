"use client";

import Button from "@/components/ui/Button";
import type { ChatChannelSummary } from "@/components/chat/types";

export default function ChatHeader({
  channel,
  canModerate,
  onToggleLock,
  onManageMembers
}: {
  channel: ChatChannelSummary;
  canModerate: boolean;
  onToggleLock: () => void;
  onManageMembers?: () => void;
}) {
  return (
    <div className="space-y-2 border-b border-mist-100 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
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
