import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type SectionTitleProps = {
  title: string;
  subtitle?: ReactNode;
  /** Right-aligned actions */
  actions?: ReactNode;
  /** Visual size variant */
  size?: "default" | "lg";
  className?: string;
};

/**
 * Section title with optional subtitle and actions.
 * Use for page headers and major section headings.
 */
export default function SectionTitle({
  title,
  subtitle,
  actions,
  size = "default",
  className
}: SectionTitleProps) {
  return (
    <header className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1
          className={cn(
            "font-semibold text-ink-900",
            size === "lg" ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
          )}
        >
          {title}
        </h1>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {subtitle ? (
        <p className="max-w-2xl text-sm leading-relaxed text-ink-500">{subtitle}</p>
      ) : null}
    </header>
  );
}

/**
 * Smaller section header for subsections within a page.
 */
export function SubsectionTitle({
  title,
  subtitle,
  actions,
  className
}: Omit<SectionTitleProps, "size">) {
  return (
    <header className={cn("space-y-0.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {subtitle ? <p className="text-sm text-ink-500">{subtitle}</p> : null}
    </header>
  );
}
