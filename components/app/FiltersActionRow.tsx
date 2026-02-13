import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type FiltersActionRowProps = {
  filters: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function FiltersActionRow({ filters, action, className }: FiltersActionRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className="min-w-0 shrink">{filters}</div>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  );
}
