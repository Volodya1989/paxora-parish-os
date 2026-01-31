import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type PageSummaryChip = {
  label: string;
  tone?: "mist" | "emerald" | "sky" | "amber" | "rose" | "indigo" | "primary";
};

type PageShellProps = {
  title: string;
  description?: string;
  summaryChips?: PageSummaryChip[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Content spacing variant */
  spacing?: "default" | "compact" | "relaxed";
};

const toneStyles: Record<NonNullable<PageSummaryChip["tone"]>, string> = {
  mist: "bg-mist-100 text-ink-700",
  emerald: "bg-emerald-100 text-emerald-800",
  sky: "bg-sky-100 text-sky-800",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-700",
  indigo: "bg-indigo-100 text-indigo-700",
  primary: "bg-primary-100 text-primary-800"
};

const spacingStyles = {
  compact: "space-y-4",
  default: "space-y-6",
  relaxed: "space-y-8"
};

export function SummaryChips({ chips }: { chips: PageSummaryChip[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            toneStyles[chip.tone ?? "mist"]
          )}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Page shell component providing consistent page layout structure.
 * Includes header with title, description, summary chips, and actions.
 */
export default function PageShell({
  title,
  description,
  summaryChips,
  actions,
  children,
  className,
  spacing = "default"
}: PageShellProps) {
  return (
    <div className={cn(spacingStyles[spacing], className)}>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-ink-900 md:text-2xl">{title}</h1>
            {summaryChips?.length ? <SummaryChips chips={summaryChips} /> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
