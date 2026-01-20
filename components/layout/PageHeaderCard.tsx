import type { ReactNode } from "react";
import Card from "@/components/ui/Card";

type PageHeaderCardProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
};

export default function PageHeaderCard({
  title,
  description,
  badge,
  actions
}: PageHeaderCardProps) {
  return (
    <Card>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h1">{title}</h1>
            {badge}
          </div>
          {description ? <p className="text-sm text-ink-500">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
