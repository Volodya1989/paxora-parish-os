import React, { type ReactNode } from "react";
import EmptyState from "@/components/ui/EmptyState";

export type EmptyStateBlockProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
};

export default function EmptyStateBlock({
  icon,
  title,
  description,
  action
}: EmptyStateBlockProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className="bg-mist-50"
    />
  );
}
