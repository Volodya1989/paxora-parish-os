import type { ReactNode } from "react";
import EmptyState, { type EmptyStateVariant } from "@/components/ui/EmptyState";
import { cn } from "@/lib/ui/cn";

type ListEmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  /** Visual style variant */
  variant?: EmptyStateVariant;
  className?: string;
};

/**
 * Empty state specifically for list views.
 * Uses calmer styling appropriate for parish community context.
 */
export default function ListEmptyState({
  title,
  description,
  action,
  icon,
  variant = "calm",
  className
}: ListEmptyStateProps) {
  return (
    <div className={cn("py-2", className)}>
      <EmptyState
        title={title}
        description={description ?? "Check back soon for updates."}
        action={action ?? null}
        icon={icon}
        variant={variant}
      />
    </div>
  );
}
