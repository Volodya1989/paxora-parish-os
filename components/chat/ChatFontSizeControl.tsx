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
  const isMin = fontSize <= min;
  const isMax = fontSize >= max;
  const isLight = tone === "light";

  const clearCollapseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
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

  const openControls = () => {
    setExpanded(true);
    scheduleCollapse();
  };

  if (!expanded) {
    return (
      <button
        type="button"
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border transition",
          isLight
            ? "border-white/20 bg-white/10 text-white/90 hover:bg-white/15 active:bg-white/25"
            : "border-mist-200 bg-mist-50 text-ink-600 hover:bg-white active:bg-mist-100"
        )}
        onClick={openControls}
        aria-label={t("chat.fontSize.open")}
        title={t("chat.fontSize.open")}
      >
        <MdTextFields className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-full border px-1 transition-all duration-150",
        isLight ? "border-white/20 bg-white/10" : "border-mist-200 bg-mist-50"
      )}
      role="group"
      aria-label={t("chat.fontSize.groupLabel")}
    >
      <button
        type="button"
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full transition",
          isLight
            ? "text-white/90 hover:bg-white/15 active:bg-white/25"
            : "text-ink-600 hover:bg-white active:bg-mist-100",
          isMin && "pointer-events-none opacity-45"
        )}
        onClick={() => {
          onDecrease();
          scheduleCollapse();
        }}
        aria-label={t("chat.fontSize.decrease")}
        disabled={isMin}
      >
        <MdTextDecrease className="h-5 w-5" />
      </button>
      <span
        className={cn(
          "min-w-7 text-center text-xs font-semibold tabular-nums",
          isLight ? "text-white/80" : "text-ink-500"
        )}
        aria-live="polite"
      >
        {fontSize}
      </span>
      <button
        type="button"
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full transition",
          isLight
            ? "text-white/90 hover:bg-white/15 active:bg-white/25"
            : "text-ink-600 hover:bg-white active:bg-mist-100",
          isMax && "pointer-events-none opacity-45"
        )}
        onClick={() => {
          onIncrease();
          scheduleCollapse();
        }}
        aria-label={t("chat.fontSize.increase")}
        disabled={isMax}
      >
        <MdTextIncrease className="h-5 w-5" />
      </button>
    </div>
  );
}
