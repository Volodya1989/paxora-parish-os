import React, { type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/ui/cn";

type SectionCardProps = {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function SectionCard({
  title,
  meta,
  action,
  children,
  className
}: SectionCardProps) {
  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-h3">{title}</h2>
          {meta ? <div className="text-xs text-ink-400">{meta}</div> : null}
        </div>
        {action}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </Card>
  );
}
