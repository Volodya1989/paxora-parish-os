import { useMemo } from "react";
import Link from "next/link";
import { routes } from "@/lib/navigation/routes";

type QuickActionsProps = {
  onSelect: () => void;
};

export default function QuickActions({ onSelect }: QuickActionsProps) {
  const actions = useMemo(
    () => [
      {
        title: "Add serve item",
        description: "Create a weekly serve item for your ministry.",
        href: `${routes.serve}?create=task`
      },
      {
        title: "Add Event",
        description: "Schedule services, rehearsals, or gatherings.",
        href: `${routes.calendar}?create=event`
      },
      {
        title: "Add Announcement",
        description: "Share updates with the parish.",
        href: `${routes.announcements}/new`
      }
    ],
    []
  );

  return (
    <div className="space-y-3">
      {actions.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          onClick={onSelect}
          className="flex items-start justify-between gap-3 rounded-card border border-mist-200 bg-white px-4 py-3 text-left transition hover:border-mist-100 hover:bg-mist-50 focus-ring"
        >
          <div>
            <p className="text-sm font-semibold text-ink-900">{action.title}</p>
            <p className="text-xs text-ink-500">{action.description}</p>
          </div>
          <span className="text-lg text-ink-300">→</span>
        </Link>
      ))}
    </div>
  );
}
