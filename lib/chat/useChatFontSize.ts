"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export const CHAT_FONT_SIZE_MIN = 9;
export const CHAT_FONT_SIZE_MAX = 22;
export const CHAT_FONT_SIZE_DEFAULT = 16;

export function clampChatFontSize(value: number): number {
  if (!Number.isFinite(value)) return CHAT_FONT_SIZE_DEFAULT;
  return Math.min(CHAT_FONT_SIZE_MAX, Math.max(CHAT_FONT_SIZE_MIN, Math.round(value)));
}

export function buildChatFontSizeStorageKey(userId: string, parishId: string): string {
  return `paxora.chat.fontSize.${parishId}.${userId}`;
}

export function useChatFontSize({ userId, parishId }: { userId: string; parishId: string }) {
  const storageKey = useMemo(() => buildChatFontSizeStorageKey(userId, parishId), [userId, parishId]);
  const [fontSize, setFontSizeState] = useState(CHAT_FONT_SIZE_DEFAULT);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = Number(stored);
      setFontSizeState(clampChatFontSize(parsed));
    } catch {
      // localStorage can fail in private mode; keep defaults.
    }
  }, [storageKey]);

  const setFontSize = useCallback(
    (next: number | ((current: number) => number)) => {
      setFontSizeState((current) => {
        const resolved = typeof next === "function" ? (next as (value: number) => number)(current) : next;
        const clamped = clampChatFontSize(resolved);

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(storageKey, String(clamped));
          } catch {
            // Ignore persistence failures.
          }
        }

        return clamped;
      });
    },
    [storageKey]
  );

  const increase = useCallback(() => {
    setFontSize((current) => current + 1);
  }, [setFontSize]);

  const decrease = useCallback(() => {
    setFontSize((current) => current - 1);
  }, [setFontSize]);

  return {
    fontSize,
    setFontSize,
    increase,
    decrease,
    min: CHAT_FONT_SIZE_MIN,
    max: CHAT_FONT_SIZE_MAX
  };
}
