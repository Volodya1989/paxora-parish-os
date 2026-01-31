"use client";

import type { ReactNode } from "react";
import { useTranslations } from "@/lib/i18n/provider";
import LanguageIconToggle from "@/components/navigation/LanguageIconToggle";
import { SunIcon } from "@/components/icons/ParishIcons";

type ParishionerHeaderProps = {
  /** Parish name to display */
  parishName: string;
  /** Optional right-aligned actions (e.g., view toggle for users who can switch views) */
  actions?: ReactNode;
};

/**
 * Modern, welcoming header for the parishioner landing page.
 * Features a warm gradient background, greeting based on time of day,
 * and a friendly, personal tone.
 * 
 * Design goal: "I am home. This is my parish. I feel welcomed."
 */
export default function ParishionerHeader({
  parishName,
  actions
}: ParishionerHeaderProps) {
  const t = useTranslations();

  // Get time-based greeting
  const hour = new Date().getHours();
  let greeting = "Good morning";
  let greetingEmoji = "sunrise";
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
    greetingEmoji = "sun";
  } else if (hour >= 17) {
    greeting = "Good evening";
    greetingEmoji = "sunset";
  }

  return (
    <header className="relative -mx-4 -mt-6 mb-2 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-500 px-5 pb-8 pt-4 text-white md:-mx-8 md:px-8">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute right-1/4 top-1/3 h-20 w-20 rounded-full bg-white/5" />
        <div className="absolute bottom-1/4 left-1/3 h-12 w-12 rounded-full bg-white/5" />
      </div>

      {/* Top bar with language toggle and actions */}
      <div className="relative mb-6 flex items-center justify-between">
        <LanguageIconToggle />
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      {/* Main content */}
      <div className="relative space-y-3">
        {/* Time-based greeting with icon */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <SunIcon className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-white/90">
            {greeting}
          </p>
        </div>

        {/* Welcome message */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("landing.welcome")}
          </h1>
          <p className="text-base font-medium text-white/80">
            {parishName}
          </p>
        </div>

        {/* Subtle tagline */}
        <p className="max-w-sm text-sm leading-relaxed text-white/70">
          Your home for parish life, community, and faith
        </p>
      </div>
    </header>
  );
}
