import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/ui/cn";

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
  children: ReactNode;
  className?: string;
};

export default function SectionCard({
  title,
  description,
  action,
  icon,
  iconClassName,
  children,
  className
}: SectionCardProps) {
  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon ? (
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full bg-mist-100 text-ink-500",
                iconClassName
              )}
            >
              {icon}
            </span>
          ) : null}
          <div>
            <h2 className="text-h3">{title}</h2>
            {description ? <div className="text-xs text-ink-400">{description}</div> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </Card>
  );
}
