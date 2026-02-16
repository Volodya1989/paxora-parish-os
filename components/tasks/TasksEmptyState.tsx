"use client";

import React from "react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useTranslations } from "@/lib/i18n/provider";

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
  const t = useTranslations();
  if (variant === "no-matches") {
    return (
      <EmptyState
        icon={<TaskIcon />}
        title={t("emptyStates.noMatches")}
        description={t("emptyStates.noMatchesDesc")}
        action={
          onClearFilters ? (
            <Button variant="secondary" onClick={onClearFilters}>
              {t("emptyStates.clearFilters")}
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<TaskIcon />}
      title={t("empty.noTasks")}
      description={t("empty.noTasksDesc")}
      action={
        onCreate ? (
          <Button onClick={onCreate}>
            {t("emptyStates.createFirstServe")}
          </Button>
        ) : null
      }
    />
  );
}
