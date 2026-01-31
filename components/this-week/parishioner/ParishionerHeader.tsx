"use client";

import type { ReactNode } from "react";
import { useTranslations } from "@/lib/i18n/provider";

type ParishionerHeaderProps = {
  /** Parish name to display */
  parishName: string;
  /** Optional right-aligned actions (e.g., view toggle for admins) */
  actions?: ReactNode;
};

/**
 * Simplified header for the parishioner landing page.
 * Shows parish name prominently with a warm, welcoming design.
 * Removes admin-focused metadata (week selectors, timestamps, etc.)
 */
export default function ParishionerHeader({ parishName, actions }: ParishionerHeaderProps) {
  const t = useTranslations();

  return (
    <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-500 px-5 py-6 text-white shadow-lg sm:px-6 sm:py-8">
      {/* Decorative background elements */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute right-1/3 top-1/2 h-12 w-12 rounded-full bg-white/5" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary-100">{t("landing.welcome")}</p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{parishName}</h1>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
