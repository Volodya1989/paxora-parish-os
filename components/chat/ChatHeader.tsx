"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatChannelSummary } from "@/components/chat/types";
import { cn } from "@/lib/ui/cn";
import { useTranslations } from "@/lib/i18n/provider";

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
  const t = useTranslations();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [channelSearchOpen, setChannelSearchOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");

  const handleBack = useCallback(() => {
    // Reliable back navigation: check if we have meaningful history,
    // otherwise fall back to the groups/community page.
    // Use native history.back() for instant feel when possible.
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else if (channel.type === "GROUP" && channel.group) {
      router.push(`/groups/${channel.group.id}`);
    } else {
      router.push("/community/chat");
    }
  }, [channel, router]);

  const openMenu = useCallback(() => {
    const btn = menuBtnRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
    setMenuOpen(true);
  }, []);

  // Recalculate menu position on scroll/resize while open
  useEffect(() => {
    if (!menuOpen) return;
    const update = () => {
      const btn = menuBtnRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setMenuPos({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right
        });
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [menuOpen]);

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

  const filteredChannels = useMemo(() => {
    if (!channelSearch.trim()) return channelOptions;
    const query = channelSearch.toLowerCase();
    return channelOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [channelOptions, channelSearch]);

  const showSwitcher = Boolean(channels && channels.length > 1 && onChannelChange);
  const hasModerateItems = canModerate;

  return (
    <div className="rounded-t-card">
      {/* Emerald themed header bar */}
      <div className="flex items-center gap-3 bg-emerald-600 px-3 py-3 touch-manipulation" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:bg-white/20"
          aria-label="Go back"
          onClick={handleBack}
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


        {channel.group ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-xs font-semibold text-white">
            {channel.group.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.group.avatarUrl} alt={channel.group.name} className="h-full w-full object-cover" />
            ) : (
              channel.group.name.slice(0, 2).toUpperCase()
            )}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">{channel.name}</h2>
          {channel.description ? (
            <p className="truncate text-xs text-emerald-100">{channel.description}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {channel.type === "ANNOUNCEMENT" ? (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
              Announcement
            </span>
          ) : null}
          {channel.lockedAt ? (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
              Locked
            </span>
          ) : null}

          {/* Channel switcher icon */}
          {showSwitcher ? (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Search channels"
              onClick={() => {
                setChannelSearchOpen((prev) => !prev);
                setChannelSearch("");
              }}
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
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : null}

          {/* Moderation overflow menu */}
          {hasModerateItems ? (
            <div>
              <button
                ref={menuBtnRef}
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:bg-white/20"
                aria-label="Chat options"
                aria-expanded={menuOpen}
                onClick={() => {
                  if (menuOpen) {
                    setMenuOpen(false);
                  } else {
                    openMenu();
                  }
                }}
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
              {menuOpen && menuPos ? (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    className="fixed z-[70] w-52 rounded-card border border-mist-200 bg-white py-1 shadow-lg"
                    style={{ top: menuPos.top, right: menuPos.right }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-mist-50 active:bg-mist-100"
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
                        className="flex w-full items-center px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-mist-50 active:bg-mist-100"
                        onClick={() => {
                          onManageMembers();
                          setMenuOpen(false);
                        }}
                      >
                        Manage members
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Channel search/filter overlay */}
      {channelSearchOpen ? (
        <>
          <div
            className="fixed inset-0 z-[45]"
            onClick={() => setChannelSearchOpen(false)}
          />
          <div className="relative z-[50] border-b border-mist-100 bg-white px-4 py-2">
            <input
              type="text"
              value={channelSearch}
              onChange={(event) => setChannelSearch(event.target.value)}
              placeholder={t("chat.header.searchPlaceholder")}
              className="w-full rounded-lg border border-mist-200 bg-mist-50 px-3 py-1.5 text-sm text-ink-700 placeholder:text-ink-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
              autoFocus
              aria-label="Search channels"
            />
            <div className="mt-2 max-h-48 overflow-y-auto">
              {filteredChannels.length === 0 ? (
                <p className="px-1 py-2 text-xs text-ink-400">{t("chat.header.noChannelsFound")}</p>
              ) : null}
              {filteredChannels.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-mist-50",
                    option.value === channel.id
                      ? "font-medium text-emerald-700 bg-emerald-50"
                      : "text-ink-700"
                  )}
                  onClick={() => {
                    onChannelChange?.(option.value);
                    setChannelSearchOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
