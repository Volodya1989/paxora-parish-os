"use client";

import type { MilestoneTier } from "@/lib/hours/milestones";
import { useTranslations } from "@/lib/i18n/provider";

type VolunteerHoursSummaryProps = {
  ytdHours: number;
  tier: MilestoneTier;
};

const tierBadgeStyles: Record<MilestoneTier, string> = {
  NONE: "bg-mist-100 text-ink-500",
  BRONZE: "bg-amber-100 text-amber-700",
  SILVER: "bg-slate-100 text-slate-700",
  GOLD: "bg-yellow-100 text-yellow-700"
};

export default function VolunteerHoursSummary({
  ytdHours,
  tier
}: VolunteerHoursSummaryProps) {
  const t = useTranslations();

  const tierLabels: Record<MilestoneTier, string> = {
    NONE: t("serve.tiers.growing"),
    BRONZE: t("serve.tiers.bronze"),
    SILVER: t("serve.tiers.silver"),
    GOLD: t("serve.tiers.gold")
  };

  return (
    <div className="flex items-center gap-3 rounded-card border border-mist-200 bg-white px-4 py-2.5 shadow-card">
      <span className="text-sm font-medium text-ink-500">{t("serve.myHours")}</span>
      <span className="text-lg font-semibold text-ink-900">
        {ytdHours.toFixed(1)} {t("serve.hoursAbbrev")}
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tierBadgeStyles[tier]}`}
      >
        {tierLabels[tier]}
      </span>
    </div>
  );
}
