import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { routes } from "@/lib/navigation/routes";

type GratitudeSpotlightCardProps = {
  enabled: boolean;
  limit: number;
  items: Array<{
    id: string;
    nomineeName: string;
    reason: string;
  }>;
  showCta?: boolean;
  headerActions?: ReactNode;
};

export default function GratitudeSpotlightCard({
  enabled,
  limit,
  items,
  showCta = false,
  headerActions
}: GratitudeSpotlightCardProps) {
  if (!enabled) {
    return null;
  }

  const visibleItems = items.slice(0, limit);
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  return (
    <Card className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-900">Gratitude Spotlight</p>
          <p className="text-xs text-ink-500">This week’s gratitude highlights.</p>
        </div>
        {showCta || headerActions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {headerActions}
            {showCta ? (
              <Link
                href={routes.gratitudeBoard}
                className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary-700 shadow-sm underline-offset-4 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:underline"
              >
                View board
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {visibleItems.length ? (
        <ul className="space-y-2 text-sm text-ink-700">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-card border border-emerald-100 bg-emerald-50/60 px-3 py-2"
            >
              <span className="mt-0.5 text-base">✨</span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  {item.nomineeName || "Parishioner"}
                </p>
                <p className="text-xs text-emerald-700">{item.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500">
          No gratitude highlights yet this week.
        </p>
      )}

      {remainingCount > 0 ? (
        <p className="text-xs text-ink-400">+{remainingCount} more</p>
      ) : null}
    </Card>
  );
}
