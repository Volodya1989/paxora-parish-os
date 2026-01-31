"use client";

import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { LayoutGridIcon } from "@/components/icons/ParishIcons";

type ParishHubEmptyStateProps = {
  isAdmin?: boolean;
};

export default function ParishHubEmptyState({ isAdmin }: ParishHubEmptyStateProps) {
  return (
    <EmptyState
      icon={<LayoutGridIcon className="h-10 w-10" />}
      title="Parish Hub not available"
      description="The parish hub has not been configured yet. Check back later for quick links to parish resources."
      action={
        isAdmin ? (
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-2 rounded-button border border-mist-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-900 transition hover:bg-mist-50 focus-ring"
          >
            Configure Parish Hub
          </Link>
        ) : null
      }
    />
  );
}
