"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { ListChecksIcon } from "@/components/icons/ParishIcons";

type HeaderActionBarProps = {
  /** Content rendered on the left side (filter controls, tabs, etc.) */
  left?: ReactNode;
  /** Handler for the filter button; if omitted the filter button is hidden */
  onFilterClick?: () => void;
  /** Whether the filter is currently active (has non-default values) */
  filterActive?: boolean;
  /** Handler for the add (+) button; if omitted the add button is hidden */
  onAddClick?: () => void;
  /** Accessible label for the add button (e.g. "New event") */
  addLabel?: string;
  /** Extra class names */
  className?: string;
};

/**
 * Shared action bar used across Serve, Groups, and Calendar pages.
 *
 * Provides a soft elevated container with a filter button on the left and
 * a primary circular "+" add button on the right.
 */
export default function HeaderActionBar({
  left,
  onFilterClick,
  filterActive = false,
  onAddClick,
  addLabel = "Add",
  className
}: HeaderActionBarProps) {
  const showFilterButton = Boolean(onFilterClick);
  const showAddButton = Boolean(onAddClick);

  // Don't render if there's nothing to show
  if (!showFilterButton && !showAddButton && !left) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border border-mist-100 bg-white/80 px-3 py-2 shadow-card backdrop-blur-sm",
        className
      )}
    >
      {/* Left side: filter button + custom content */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showFilterButton ? (
          <button
            type="button"
            onClick={onFilterClick}
            aria-label="Filters"
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition",
              filterActive
                ? "border-primary-200 bg-primary-50 text-primary-700"
                : "border-mist-200 bg-white text-ink-600 hover:bg-mist-50 hover:border-mist-300"
            )}
          >
            <ListChecksIcon className="h-4 w-4" />
            <span className="hidden xs:inline">Filters</span>
            {filterActive ? (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary-500" aria-hidden="true" />
            ) : null}
          </button>
        ) : null}
        {left}
      </div>

      {/* Right side: add button */}
      {showAddButton ? (
        <button
          type="button"
          onClick={onAddClick}
          aria-label={addLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 active:scale-95"
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
      ) : (
        <div className="h-11 min-w-11" aria-hidden="true" />
      )}
    </div>
  );
}
