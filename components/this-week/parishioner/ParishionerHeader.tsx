"use client";

import { type ReactNode, useState, useEffect } from "react";
import { useTranslations } from "@/lib/i18n/provider";
import LanguageIconToggle from "@/components/navigation/LanguageIconToggle";
import { SparklesIcon } from "@/components/icons/ParishIcons";

type ParishionerHeaderProps = {
  /** Parish name to display */
  parishName: string;
  /** User's first name for personalized greeting */
  userName?: string;
  /** Optional right-aligned actions (e.g., view toggle for users who can switch views) */
  actions?: ReactNode;
};

/**
 * Warm, welcoming header for the parishioner landing page.
 * Features a personalized greeting, parish name, and icon-based language toggle.
 * Removes all admin-focused controls (week selectors, timestamps, + Add).
 * 
 * Design goal: "I am home. This is my parish."
 */
export default function ParishionerHeader({
  parishName,
  userName,
  actions
}: ParishionerHeaderProps) {
  const t = useTranslations();

  // Use state to prevent hydration mismatch - start with generic greeting
  // then update to time-based greeting on client
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    setGreeting(timeGreeting);
  }, []);

  return (
    <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-500 px-5 py-6 text-white shadow-lg sm:px-6 sm:py-8">
      {/* Decorative background elements */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 left-1/4 h-20 w-20 rounded-full bg-white/5" />
      <div className="absolute right-1/3 top-1/2 h-12 w-12 rounded-full bg-white/5" />

      {/* Top bar with language toggle */}
      <div className="relative mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
          <SparklesIcon className="h-4 w-4" />
          <span className="text-xs font-medium">{t("landing.welcome")}</span>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <LanguageIconToggle />
        </div>
      </div>

      {/* Main greeting */}
      <div className="relative space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting}{userName ? `, ${userName}` : ""}!
        </h1>
        <p className="text-sm font-medium text-white/80 sm:text-base">
          {parishName}
        </p>
      </div>
    </header>
  );
}
