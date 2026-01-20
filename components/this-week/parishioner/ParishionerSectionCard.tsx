import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/ui/cn";

type ParishionerSectionCardProps = {
  title: string;
  icon: ReactNode;
  borderClass: string;
  iconClass: string;
  action?: ReactNode;
  children: ReactNode;
  meta?: ReactNode;
};

export default function ParishionerSectionCard({
  title,
  icon,
  borderClass,
  iconClass,
  action,
  meta,
  children
}: ParishionerSectionCardProps) {
  return (
    <Card className={cn("flex h-full flex-col border-l-4", borderClass)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", iconClass)}>
            {icon}
          </span>
          <div>
            <h2 className="text-h3">{title}</h2>
            {meta ? <div className="text-xs text-ink-400">{meta}</div> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </Card>
  );
}
