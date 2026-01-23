import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type PageSummaryChip = {
  label: string;
  tone?: "mist" | "emerald" | "sky" | "amber" | "rose" | "indigo";
};

type PageShellProps = {
  title: string;
  description?: string;
  summaryChips?: PageSummaryChip[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const toneStyles: Record<NonNullable<PageSummaryChip["tone"]>, string> = {
  mist: "bg-mist-100 text-ink-700",
  emerald: "bg-emerald-100 text-emerald-800",
  sky: "bg-sky-100 text-sky-800",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-700",
  indigo: "bg-indigo-100 text-indigo-700"
};

export function SummaryChips({ chips }: { chips: PageSummaryChip[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            toneStyles[chip.tone ?? "mist"]
          )}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export default function PageShell({
  title,
  description,
  summaryChips,
  actions,
  children,
  className
}: PageShellProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h2">{title}</h1>
            {summaryChips?.length ? <SummaryChips chips={summaryChips} /> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {description ? <p className="text-sm text-ink-500">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
