"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MdTextDecrease, MdTextFields, MdTextIncrease } from "react-icons/md";
import { cn } from "@/lib/ui/cn";
import { useTranslations } from "@/lib/i18n/provider";

const AUTO_HIDE_MS = 10_000;

export default function ChatFontSizeControl({
  fontSize,
  min,
  max,
  onDecrease,
  onIncrease,
  tone = "light"
}: {
  fontSize: number;
  min: number;
  max: number;
  onDecrease: () => void;
  onIncrease: () => void;
  tone?: "light" | "dark";
}) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMin = fontSize <= min;
  const isMax = fontSize >= max;
  const isLight = tone === "light";

  const clearCollapseTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const scheduleCollapse = useCallback(() => {
    clearCollapseTimer();
    timerRef.current = setTimeout(() => {
      setExpanded(false);
    }, AUTO_HIDE_MS);
  }, [clearCollapseTimer]);

  useEffect(() => {
    if (!expanded) {
      clearCollapseTimer();
      return;
    }

    scheduleCollapse();
    return clearCollapseTimer;
  }, [expanded, clearCollapseTimer, scheduleCollapse]);

  useEffect(() => {
    if (!expanded) return;
    const handleOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      setExpanded(false);
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [expanded]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border transition",
          isLight
            ? "border-white/20 bg-white/10 text-white/90 hover:bg-white/15 active:bg-white/25"
            : "border-mist-200 bg-mist-50 text-ink-600 hover:bg-white active:bg-mist-100"
        )}
        onClick={() => {
          setExpanded((prev) => !prev);
          scheduleCollapse();
        }}
        aria-label={t("chat.fontSize.open")}
        title={t("chat.fontSize.open")}
        aria-expanded={expanded}
      >
        <MdTextFields className="h-5 w-5" />
      </button>

      {expanded ? (
        <div
          className={cn(
            "absolute right-0 top-[calc(100%+0.45rem)] z-30 flex min-w-[8.5rem] items-center justify-between gap-1 rounded-xl border px-2 py-1.5 shadow-lg",
            isLight ? "border-mist-200 bg-white text-ink-700" : "border-mist-200 bg-white text-ink-700"
          )}
          role="group"
          aria-label={t("chat.fontSize.groupLabel")}
        >
          <button
            type="button"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-mist-50 active:bg-mist-100",
              isMin && "pointer-events-none opacity-45"
            )}
            onClick={() => {
              onDecrease();
              scheduleCollapse();
            }}
            aria-label={t("chat.fontSize.decrease")}
            disabled={isMin}
          >
            <MdTextDecrease className="h-4 w-4" />
          </button>
          <span className="min-w-7 text-center text-xs font-semibold tabular-nums text-ink-600" aria-live="polite">
            {fontSize}
          </span>
          <button
            type="button"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-mist-50 active:bg-mist-100",
              isMax && "pointer-events-none opacity-45"
            )}
            onClick={() => {
              onIncrease();
              scheduleCollapse();
            }}
            aria-label={t("chat.fontSize.increase")}
            disabled={isMax}
          >
            <MdTextIncrease className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
