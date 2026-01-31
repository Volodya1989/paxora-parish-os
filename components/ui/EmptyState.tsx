import React, { type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type EmptyStateVariant = "default" | "calm" | "friendly";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  /** Visual style variant. "calm" uses softer borders, "friendly" adds warmth. */
  variant?: EmptyStateVariant;
};

const variantStyles: Record<EmptyStateVariant, string> = {
  default: "border-dashed border-mist-200 bg-white",
  calm: "border-transparent bg-mist-50/50",
  friendly: "border-dashed border-primary-100 bg-primary-50/30"
};

/**
 * Empty state component for blank or no-data views.
 * Designed with a warm, pastoral tone for parishioners.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = "default"
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-card border px-6 py-12 text-center",
        variantStyles[variant],
        className
      )}
    >
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mist-100 text-ink-400">
          {icon}
        </div>
      ) : null}
      <div className="max-w-sm space-y-2">
        <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
        <p className="text-sm leading-relaxed text-ink-500">{description}</p>
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
