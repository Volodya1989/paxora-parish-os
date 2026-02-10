"use client";

import { type ReactNode, useState, useEffect } from "react";
import { useTranslations } from "@/lib/i18n/provider";
import LanguageIconToggle from "@/components/navigation/LanguageIconToggle";
import { SparklesIcon } from "@/components/icons/ParishIcons";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useNotificationContext } from "@/components/notifications/NotificationProvider";
import QuickActions from "@/components/this-week/QuickActions";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";

type ParishionerHeaderProps = {
  /** Parish name to display */
  parishName: string;
  /** Optional parish logo URL (falls back to Paxora logo) */
  parishLogoUrl?: string | null;
  /** User's first name for personalized greeting */
  userName?: string;
  /** Optional right-aligned actions (e.g., view toggle for users who can switch views) */
  actions?: ReactNode;
  /** Show the quick-add "+" button (for leaders who don't have AppHeader on landing) */
  showQuickAdd?: boolean;
  /** Optional inspirational quote */
  quote?: string;
  /** Optional quote attribution */
  quoteSource?: string;
};

/**
 * Warm, welcoming header for the landing page.
 * Shared by both parishioner and admin views.
 * Features a personalized greeting, parish name, and icon-based language toggle.
 *
 * Design goal: "I am home. This is my parish."
 */
export default function ParishionerHeader({
  parishName,
  parishLogoUrl,
  userName,
  actions,
  showQuickAdd,
  quote,
  quoteSource
}: ParishionerHeaderProps) {
  const t = useTranslations();
  const { count } = useNotificationContext();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const logoSrc = parishLogoUrl?.trim() ? parishLogoUrl : "/icon.png";

  // Use state to prevent hydration mismatch - start with generic greeting
  // then update to time-based greeting on client
  const [greeting, setGreeting] = useState(t("landing.welcome"));

  useEffect(() => {
    const hour = new Date().getHours();
    const timeGreeting =
      hour < 12
        ? t("landing.goodMorning")
        : hour < 17
          ? t("landing.goodAfternoon")
          : t("landing.goodEvening");
    setGreeting(timeGreeting);
  }, [t]);

  return (
    <>
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-500 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-white shadow-lg sm:px-5 sm:pb-5 sm:pt-[calc(1.25rem+env(safe-area-inset-top))]">
        {/* Decorative background elements */}
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/10" />
        <div className="absolute -bottom-2 left-1/4 h-12 w-12 rounded-full bg-white/5" />
        <div className="absolute right-1/3 top-1/2 h-8 w-8 rounded-full bg-white/5" />

        {/* Top bar with controls */}
        <div className="relative mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logoSrc}
              alt={`${parishName} logo`}
              className="h-10 w-10 shrink-0 rounded-md object-contain md:h-12 md:w-12"
              onError={(e) => { e.currentTarget.src = "/icon.png"; }}
            />
            <div className="flex min-w-0 items-center gap-2 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-sm">
              <SparklesIcon className="h-3 w-3" />
              <span className="text-xs font-medium">{t("landing.welcome")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {showQuickAdd && (
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30"
                aria-label="Quick add"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
            {count > 0 && (
              <NotificationCenter bellClassName="h-8 w-8 border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 md:hidden" />
            )}
            <LanguageIconToggle />
          </div>
        </div>

        {/* Main greeting */}
        <div className="relative space-y-1">
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">
            {greeting}{userName ? `, ${userName}` : ""}!
          </h1>
          <p className="text-sm font-semibold text-white sm:text-base">
            {parishName}
          </p>
          {quote && (
            <blockquote className="mt-2 border-l-4 border-white/40 pl-3 text-xs italic text-white/90">
              <p>{quote}</p>
              {quoteSource && (
                <footer className="mt-1 text-xs text-white/70">— {quoteSource}</footer>
              )}
            </blockquote>
          )}
          {/* Subtle view switch link at bottom of hero */}
          {actions && (
            <div className="mt-3 flex justify-end">
              {actions}
            </div>
          )}
        </div>
      </header>

      {/* Quick-add modal/drawer for leaders */}
      {showQuickAdd && (
        <>
          <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Quick add">
            <p className="mb-4 text-sm text-ink-500">
              Create something new without leaving the weekly overview.
            </p>
            <QuickActions onSelect={() => setQuickAddOpen(false)} />
          </Modal>
          <Drawer open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Quick add">
            <p className="mb-4 text-sm text-ink-500">
              Create something new without leaving the weekly overview.
            </p>
            <QuickActions onSelect={() => setQuickAddOpen(false)} />
          </Drawer>
        </>
      )}
    </>
  );
}
