"use client";

import { MdTextDecrease, MdTextIncrease } from "react-icons/md";
import { cn } from "@/lib/ui/cn";
import { useTranslations } from "@/lib/i18n/provider";

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
  const isMin = fontSize <= min;
  const isMax = fontSize >= max;
  const isLight = tone === "light";

  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-full border px-1",
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
        onClick={onDecrease}
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
        onClick={onIncrease}
        aria-label={t("chat.fontSize.increase")}
        disabled={isMax}
      >
        <MdTextIncrease className="h-5 w-5" />
      </button>
    </div>
  );
}
