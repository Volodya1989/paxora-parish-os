"use client";

import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { routes } from "@/lib/navigation/routes";
import { useTranslations } from "@/lib/i18n/provider";

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
  const t = useTranslations();

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
          <p className="font-semibold text-ink-900">{t("thisWeek.gratitudeSpotlight.title")}</p>
          <p className="text-sm text-ink-500">{t("thisWeek.gratitudeSpotlight.subtitle")}</p>
        </div>
        {showCta || headerActions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {headerActions}
            {showCta ? (
              <Link
                href={routes.gratitudeBoard}
                className="rounded-button bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-200"
              >
                {t("thisWeek.gratitudeSpotlight.viewBoard")}
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
            <span className="mt-0.5 text-lg">&#10024;</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-emerald-900">
                {item.nomineeName || t("thisWeek.gratitudeSpotlight.fallbackNominee")}
              </p>
              <p className="mt-0.5 text-sm text-emerald-700">{item.reason}</p>
            </div>
          </li>
        ))}
      </ul>

      {remainingCount > 0 && (
        <p className="text-center text-sm text-ink-400">{t("thisWeek.gratitudeSpotlight.moreHighlights").replace("{count}", String(remainingCount))}</p>
      )}
    </Card>
  );
}
