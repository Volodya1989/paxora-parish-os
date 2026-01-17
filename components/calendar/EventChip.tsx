"use client";

import React from "react";
import { cn } from "@/lib/ui/cn";

type EventChipProps = {
  title: string;
  timeLabel?: string;
  isSelected?: boolean;
  ariaLabel: string;
  recurrenceLabel?: string;
  onClick: () => void;
};

export default function EventChip({
  title,
  timeLabel,
  isSelected,
  ariaLabel,
  recurrenceLabel,
  onClick
}: EventChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex w-full flex-col gap-0.5 rounded-card border border-mist-200 bg-white px-3 py-2 text-left text-xs font-medium text-ink-700 shadow-card transition focus-ring",
        "hover:border-mist-300 hover:bg-mist-50",
        isSelected && "border-emerald-300 bg-emerald-50 text-emerald-900"
      )}
    >
      <span className="truncate text-sm font-semibold text-ink-900">{title}</span>
      {timeLabel ? <span className="text-xs text-ink-500">{timeLabel}</span> : null}
      {recurrenceLabel ? (
        <span className="text-[11px] text-ink-400">
          <span aria-hidden className="mr-1">↻</span>
          {recurrenceLabel}
        </span>
      ) : null}
    </button>
  );
}
