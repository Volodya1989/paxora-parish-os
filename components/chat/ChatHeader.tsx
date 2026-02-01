"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatChannelSummary } from "@/components/chat/types";
import { cn } from "@/lib/ui/cn";

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
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

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
  const hasMenuItems = canModerate || showSwitcher;

  return (
    <div className="flex h-14 items-center gap-3 border-b border-mist-100 px-2">
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition hover:bg-mist-50 hover:text-ink-900"
        aria-label="Go back"
        onClick={() => router.back()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-ink-900">{channel.name}</h2>
        {channel.description ? (
          <p className="truncate text-xs text-ink-400">{channel.description}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {channel.type === "ANNOUNCEMENT" ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            Announcement
          </span>
        ) : null}
        {channel.lockedAt ? (
          <span className="rounded-full bg-mist-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
            Locked
          </span>
        ) : null}

        {hasMenuItems ? (
          <div className="relative">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:bg-mist-50 hover:text-ink-900"
              aria-label="Chat options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
              </svg>
            </button>
            {menuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-card border border-mist-200 bg-white py-1 shadow-lg">
                  {canModerate ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center px-3 py-2 text-left text-sm text-ink-700 hover:bg-mist-50"
                        onClick={() => {
                          onToggleLock();
                          setMenuOpen(false);
                        }}
                      >
                        {channel.lockedAt ? "Unlock channel" : "Lock channel"}
                      </button>
                      {onManageMembers ? (
                        <button
                          type="button"
                          className="flex w-full items-center px-3 py-2 text-left text-sm text-ink-700 hover:bg-mist-50"
                          onClick={() => {
                            onManageMembers();
                            setMenuOpen(false);
                          }}
                        >
                          Manage members
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  {showSwitcher ? (
                    <>
                      {canModerate ? (
                        <div className="my-1 border-t border-mist-100" />
                      ) : null}
                      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        Switch channel
                      </p>
                      {channelOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-mist-50",
                            option.value === channel.id
                              ? "font-medium text-emerald-700"
                              : "text-ink-700"
                          )}
                          onClick={() => {
                            onChannelChange?.(option.value);
                            setMenuOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
