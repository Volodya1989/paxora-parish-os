"use client";

import { cn } from "@/lib/ui/cn";

type ParishionerAddButtonProps = {
  onClick: () => void;
  ariaLabel: string;
  className?: string;
};

export default function ParishionerAddButton({ onClick, ariaLabel, className }: ParishionerAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "ml-auto flex h-11 min-w-11 items-center justify-center rounded-full bg-primary-600 px-0 text-white shadow-sm transition hover:bg-primary-700",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </button>
  );
}
