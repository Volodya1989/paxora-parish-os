import React, { type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

/**
 * Empty state component for blank or no-data views.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-mist-200 bg-white px-6 py-10 text-center",
        className
      )}
    >
      {icon ? <div className="text-ink-400">{icon}</div> : null}
      <div className="space-y-1">
        <h3 className="text-h3">{title}</h3>
        <p className="text-sm text-ink-500">{description}</p>
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
