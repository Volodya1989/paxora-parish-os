import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type BadgeProps = {
  children: ReactNode;
  /** Visual tone for the badge. */
  tone?: "neutral" | "success" | "warning";
  className?: string;
};

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-mist-100 text-ink-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800"
};

/**
 * Badge component for small status labels.
 */
export default function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
