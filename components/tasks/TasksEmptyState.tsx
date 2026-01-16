"use client";

import React from "react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

type TasksEmptyStateProps = {
  variant: "no-tasks" | "no-matches";
  onCreate?: () => void;
  onClearFilters?: () => void;
};

function TaskIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 12.5l2.2 2.2 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TasksEmptyState({
  variant,
  onCreate,
  onClearFilters
}: TasksEmptyStateProps) {
  if (variant === "no-matches") {
    return (
      <EmptyState
        icon={<TaskIcon />}
        title="No matches"
        description="Try adjusting your filters or search to find the task you’re looking for."
        action={
          <Button variant="secondary" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<TaskIcon />}
      title="No tasks yet"
      description="Capture what matters this week and keep your teams aligned."
      action={
        <Button onClick={onCreate}>
          Create your first task
        </Button>
      }
    />
  );
}
