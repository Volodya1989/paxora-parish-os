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
    <div className="flex items-center justify-between gap-3 border-b border-mist-100 pb-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-base font-semibold text-ink-900">{channel.name}</h2>
        {channel.lockedAt ? (
          <span className="shrink-0 text-ink-400" aria-label="Channel locked">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
        ) : null}
        {channel.type === "ANNOUNCEMENT" ? (
          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            Announcement
          </span>
        ) : null}
      </div>
      {canModerate ? (
        <div className="flex shrink-0 items-center gap-1">
          {onManageMembers ? (
            <Button type="button" variant="ghost" size="sm" onClick={onManageMembers}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onToggleLock}>
            {channel.lockedAt ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
