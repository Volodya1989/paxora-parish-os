import { useMemo } from "react";
import Link from "next/link";
import { routes } from "@/lib/navigation/routes";
import {
  HandHeartIcon,
  CalendarIcon,
  MegaphoneIcon
} from "@/components/icons/ParishIcons";

type QuickActionsProps = {
  onSelect: () => void;
};

export default function QuickActions({ onSelect }: QuickActionsProps) {
  const actions = useMemo(
    () => [
      {
        title: "Add serve item",
        description: "Create a weekly serve item for your ministry.",
        href: `${routes.serve}?create=task`,
        icon: <HandHeartIcon className="h-5 w-5" />,
        accentBorder: "border-l-rose-400",
        iconBg: "bg-rose-50 text-rose-600"
      },
      {
        title: "Add event",
        description: "Schedule services, rehearsals, or gatherings.",
        href: `${routes.calendar}?create=event`,
        icon: <CalendarIcon className="h-5 w-5" />,
        accentBorder: "border-l-emerald-400",
        iconBg: "bg-emerald-50 text-emerald-600"
      },
      {
        title: "Add announcement",
        description: "Share updates with the parish.",
        href: `${routes.announcements}/new`,
        icon: <MegaphoneIcon className="h-5 w-5" />,
        accentBorder: "border-l-amber-400",
        iconBg: "bg-amber-50 text-amber-600"
      }
    ],
    []
  );

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          onClick={onSelect}
          className={`flex items-center gap-3 rounded-xl border border-mist-100 border-l-4 ${action.accentBorder} bg-white px-4 py-3 shadow-sm transition hover:shadow-md focus-ring`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${action.iconBg}`}>
            {action.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">{action.title}</p>
            <p className="text-xs text-ink-500">{action.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
