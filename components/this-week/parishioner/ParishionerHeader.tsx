"use client";

import type { ReactNode } from "react";
import { useTranslations } from "@/lib/i18n/provider";
import LanguageSwitcher from "@/components/navigation/LanguageSwitcher";

type ParishionerHeaderProps = {
  /** Parish name to display */
  parishName: string;
  /** Page title (defaults to "Home") */
  pageTitle?: string;
  /** Optional right-aligned actions (e.g., view toggle for users who can switch views) */
  actions?: ReactNode;
};

/**
 * Warm, welcoming header for the parishioner landing page.
 * Styled like iOS large-title navigation with parish name prominent.
 * Removes all admin-focused controls (week selectors, timestamps, + Add).
 * 
 * Design goal: "I am home. This is my parish."
 */
export default function ParishionerHeader({
  parishName,
  pageTitle,
  actions
}: ParishionerHeaderProps) {
  const t = useTranslations();
  const displayTitle = pageTitle ?? t("landing.home");

  return (
    <header className="space-y-4">
      {/* Top bar with language toggle and optional actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Subtle language toggle */}
          <LanguageSwitcher />
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      {/* Main header content - iOS large title style */}
      <div className="space-y-1">
        {/* Parish name - subtle, orienting context */}
        <p className="text-sm font-medium tracking-wide text-primary-600">
          {parishName}
        </p>
        
        {/* Page title - large, welcoming, iOS-style */}
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          {displayTitle}
        </h1>
      </div>
    </header>
  );
}
