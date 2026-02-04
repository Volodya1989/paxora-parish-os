"use client";

import React from "react";
import { cn } from "@/lib/ui/cn";

type NotificationBellProps = {
  count: number;
  onClick: () => void;
  className?: string;
  "aria-expanded"?: boolean;
};

/**
 * Bell icon button with notification badge count.
 * Always visible; badge appears only when count > 0.
 */
export function NotificationBell({
  count,
  onClick,
  className,
  "aria-expanded": ariaExpanded
}: NotificationBellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `${count} notifications` : "Notifications"}
      aria-expanded={ariaExpanded}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-mist-200 bg-white text-ink-700 transition hover:bg-mist-50 focus-ring",
        className
      )}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
          aria-hidden="true"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export default NotificationBell;
