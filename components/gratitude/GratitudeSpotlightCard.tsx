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
  // Don't render if not enabled or no items (reduces empty state clutter)
  if (!enabled || items.length === 0) {
    return null;
  }

  const visibleItems = items.slice(0, limit);
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  return (
    <Card className="space-y-4 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-ink-900">Gratitude Spotlight</p>
          <p className="text-sm text-ink-500">This week's gratitude highlights</p>
        </div>
        {showCta || headerActions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {headerActions}
            {showCta ? (
              <Link
                href={routes.gratitudeBoard}
                className="rounded-button bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-200"
              >
                View board
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul className="space-y-2">
        {visibleItems.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm"
          >
            <span className="mt-0.5 text-lg">✨</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-emerald-900">
                {item.nomineeName || "Parishioner"}
              </p>
              <p className="mt-0.5 text-sm text-emerald-700">{item.reason}</p>
            </div>
          </li>
        ))}
      </ul>

      {remainingCount > 0 && (
        <p className="text-center text-sm text-ink-400">+{remainingCount} more highlights</p>
      )}
    </Card>
  );
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
