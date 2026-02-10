"use client";

import Input from "@/components/ui/Input";
import { cn } from "@/lib/ui/cn";
import { useTranslations } from "@/lib/i18n/provider";

export type GroupFilterTab = "active" | "archived";

type GroupFiltersProps = {
  activeTab: GroupFilterTab;
  onTabChange: (tab: GroupFilterTab) => void;
  query: string;
  onQueryChange: (value: string) => void;
  counts: {
    active: number;
    archived: number;
  };
  layout?: "inline" | "stacked";
};

export default function GroupFilters({
  activeTab,
  onTabChange,
  query,
  onQueryChange,
  counts,
  layout = "inline"
}: GroupFiltersProps) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "flex gap-4",
        layout === "stacked"
          ? "flex-col"
          : "flex-col md:flex-row md:items-center md:justify-between"
      )}
    >
      <div className="flex items-center rounded-full border border-mist-200 bg-mist-50 p-1 text-sm">
        {(["active", "archived"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              activeTab === tab
                ? "bg-white text-ink-900 shadow-card"
                : "text-ink-500 hover:text-ink-700"
            )}
          >
            {tab === "active" ? t("groups.filters.active") : t("groups.filters.archived")}
            <span className="ml-2 text-xs text-ink-400">
              {tab === "active" ? counts.active : counts.archived}
            </span>
          </button>
        ))}
      </div>

      <div className={cn("w-full", layout === "inline" && "md:max-w-xs")}>
        <Input
          type="search"
          aria-label={t("groups.filters.search")}
          placeholder={t("groups.filters.search")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
    </div>
  );
}
