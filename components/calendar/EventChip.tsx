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
        "flex w-full flex-col gap-1 rounded-card bg-white/90 px-3 py-2 text-left text-xs font-medium text-ink-700 shadow-card transition focus-ring",
        "ring-1 ring-mist-100/70 hover:bg-mist-50",
        isSelected && "bg-emerald-50/60 ring-emerald-200 text-emerald-900"
      )}
    >
      {timeLabel ? (
        <span className="inline-flex w-fit items-center rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
          {timeLabel}
        </span>
      ) : null}
      <span className="truncate text-sm font-semibold text-ink-900">{title}</span>
      {recurrenceLabel ? (
        <span className="text-[11px] text-ink-400">
          <span aria-hidden className="mr-1">↻</span>
          {recurrenceLabel}
        </span>
      ) : null}
    </button>
  );
}
