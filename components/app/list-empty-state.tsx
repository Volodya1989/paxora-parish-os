import type { ReactNode } from "react";
import EmptyState from "@/components/ui/EmptyState";

type ListEmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function ListEmptyState({ title, description, action }: ListEmptyStateProps) {
  return (
    <div className="rounded-card border border-dashed border-mist-200 bg-white p-4">
      <EmptyState title={title} description={description ?? ""} action={action ?? null} />
    </div>
  );
}
