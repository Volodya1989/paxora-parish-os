"use client";

import { type ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/provider";
import { useLocale } from "@/lib/i18n/provider";
import LanguageIconToggle from "@/components/navigation/LanguageIconToggle";
import GivingShortcutButton from "@/components/navigation/GivingShortcutButton";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useNotificationContext } from "@/components/notifications/NotificationProvider";
import QuickActions from "@/components/this-week/QuickActions";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { buildLocalePathname } from "@/lib/i18n/routing";

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
  const locale = useLocale();
  const { count } = useNotificationContext();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quoteExpanded, setQuoteExpanded] = useState(true);
  const [quotePinnedOpen, setQuotePinnedOpen] = useState(false);
  const logoSrc = parishLogoUrl?.trim() ? parishLogoUrl : "/icon.png";
  const quoteStorageKey = "this-week:quote-expanded";

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

  useEffect(() => {
    if (!quote) return;
    const stored = sessionStorage.getItem(quoteStorageKey);
    if (stored === "collapsed") {
      setQuoteExpanded(false);
      setQuotePinnedOpen(false);
      return;
    }
    if (stored === "open") {
      setQuoteExpanded(true);
      setQuotePinnedOpen(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setQuoteExpanded(false);
      sessionStorage.setItem(quoteStorageKey, "collapsed");
    }, 20_000);

    return () => window.clearTimeout(timer);
  }, [quote]);

  const handleToggleQuote = () => {
    setQuoteExpanded((prev) => {
      const next = !prev;
      sessionStorage.setItem(quoteStorageKey, next ? "open" : "collapsed");
      setQuotePinnedOpen(next);
      return next;
    });
  };

  return (
    <>
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-500 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white shadow-lg sm:px-5 sm:pb-4 sm:pt-[calc(0.9rem+env(safe-area-inset-top))]">
        {/* Decorative background elements */}
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/10" />
        <div className="absolute -bottom-2 left-1/4 h-12 w-12 rounded-full bg-white/5" />
        <div className="absolute right-1/3 top-1/2 h-8 w-8 rounded-full bg-white/5" />

        {/* Top bar with controls */}
        <div className="relative mb-2 flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href={buildLocalePathname(locale, "/this-week")} aria-label={t("header.thisWeek")}>
              <img
                src={logoSrc}
                alt={`${parishName} logo`}
                className="h-9 w-9 shrink-0 rounded-md object-contain md:h-10 md:w-10"
                onError={(e) => { e.currentTarget.src = "/icon.png"; }}
              />
            </Link>
            <p className="line-clamp-1 text-sm font-semibold text-white/95 sm:text-base">{parishName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {showQuickAdd && (
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30"
                aria-label={t("thisWeek.quickAdd")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
            <GivingShortcutButton className="h-8 w-8 border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30" />
            {count > 0 && (
              <NotificationCenter bellClassName="h-8 w-8 border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 md:hidden" />
            )}
            <LanguageIconToggle />
          </div>
        </div>

        {/* Main greeting */}
        <div className="relative space-y-0.5">
          <h1 className="text-base font-bold tracking-tight sm:text-lg">
            {greeting}{userName ? `, ${userName}` : ""}!
          </h1>
          {quote && (
            quoteExpanded ? (
              <blockquote className="mt-1.5 border-l-4 border-white/40 pl-3 text-xs italic text-white/90">
                <p>{quote}</p>
                {quoteSource && (
                  <footer className="mt-1 text-xs text-white/70">— {quoteSource}</footer>
                )}
              </blockquote>
            ) : (
              <button
                type="button"
                onClick={handleToggleQuote}
                className="mt-1.5 text-xs font-medium text-white/90 underline underline-offset-2 transition hover:text-white"
              >
                {t("thisWeek.showQuote")}
              </button>
            )
          )}
          {quote && quoteExpanded && quotePinnedOpen && (
            <button
              type="button"
              onClick={handleToggleQuote}
              className="mt-1 text-xs font-medium text-white/90 underline underline-offset-2 transition hover:text-white"
            >
              {t("thisWeek.hideQuote")}
            </button>
          )}
          {/* Subtle view switch link at bottom of hero */}
          {actions && (
            <div className="mt-2 flex justify-end">
              {actions}
            </div>
          )}
        </div>
      </header>

      {/* Quick-add modal/drawer for leaders */}
      {showQuickAdd && (
        <>
          <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title={t("thisWeek.quickAdd")}>
            <p className="mb-4 text-sm text-ink-500">
              {t("thisWeek.quickAddDesc")}
            </p>
            <QuickActions onSelect={() => setQuickAddOpen(false)} />
          </Modal>
          <Drawer open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title={t("thisWeek.quickAdd")}>
            <p className="mb-4 text-sm text-ink-500">
              {t("thisWeek.quickAddDesc")}
            </p>
            <QuickActions onSelect={() => setQuickAddOpen(false)} />
          </Drawer>
        </>
      )}
    </>
  );
}
