"use client";

import { type ReactNode, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LanguageIconToggle from "@/components/navigation/LanguageIconToggle";
import GivingShortcutButton from "@/components/navigation/GivingShortcutButton";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useNotificationContext } from "@/components/notifications/NotificationProvider";
import { cn } from "@/lib/ui/cn";
import { useLocale } from "@/lib/i18n/provider";
import { buildLocalePathname } from "@/lib/i18n/routing";

type PageHeaderProps = {
  /** Current page title */
  pageTitle: string;
  /** Parish name to display */
  parishName: string;
  /** Optional parish logo URL (falls back to Paxora logo) */
  parishLogoUrl?: string | null;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional right-aligned actions */
  actions?: ReactNode;
  /** Custom gradient colors (defaults to primary-emerald) */
  gradientClass?: string;
  /** Optional inspirational quote for parishioner-facing pages */
  quote?: string;
  /** Optional attribution for the quote */
  quoteSource?: string;
  /** Optional icon to display next to the title */
  icon?: ReactNode;
  /** Fallback href for back button. When set, a back arrow appears top-left. */
  backHref?: string;
};

/**
 * Consistent page header for all parishioner-facing pages.
 * Features a welcoming gradient design with page title prominently displayed.
 *
 * Quote Rule (Parishioner-First Strategy):
 * - Each parishioner page may display AT MOST ONE quote
 * - Quotes must appear ONLY in PageHeader (never duplicated in page content)
 * - Quotes are inspirational/contextual to page purpose
 * - Quote attribution (quoteSource) is optional but recommended
 * - Quote placement enforces the "one header, one voice" principle
 */
export default function PageHeader({
  pageTitle,
  parishName,
  parishLogoUrl,
  subtitle,
  actions,
  gradientClass = "from-primary-600 via-primary-500 to-emerald-500",
  quote,
  quoteSource,
  icon,
  backHref
}: PageHeaderProps) {
  const { count } = useNotificationContext();
  const locale = useLocale();
  const router = useRouter();
  const logoSrc = parishLogoUrl?.trim() ? parishLogoUrl : "/icon.png";

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else if (backHref) {
      router.push(backHref);
    }
  }, [router, backHref]);

  return (
    <header
      className={cn(
        "relative -mx-4 -mt-6 overflow-hidden bg-gradient-to-br px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-white md:-mx-8 md:rounded-b-2xl md:px-6",
        gradientClass
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-2 left-1/4 h-12 w-12 rounded-full bg-white/5" />

      {/* Top bar with actions and parish identity. Keep identity on its own row on mobile to avoid text compression. */}
      <div className="relative mb-3 space-y-2">
        <div className="flex justify-end">
          <div className="flex shrink-0 items-center gap-1.5">
            {actions}
            <GivingShortcutButton className="h-8 w-8 border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30" />
            {count > 0 && (
              <NotificationCenter bellClassName="h-8 w-8 border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 md:hidden" />
            )}
            <LanguageIconToggle />
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 text-sm font-semibold text-white">
          {backHref ? (
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:bg-white/20 touch-manipulation"
              aria-label="Go back"
              onClick={handleBack}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : null}
          <Link href={buildLocalePathname(locale, "/this-week")} aria-label="Go to This Week">
            <img
              src={logoSrc}
              alt={`${parishName} logo`}
              className="h-10 w-10 shrink-0 rounded-md object-contain md:h-12 md:w-12"
              onError={(e) => {
                e.currentTarget.src = "/icon.png";
              }}
            />
          </Link>
          <span className="min-w-0 truncate text-xs leading-tight sm:text-sm">{parishName}</span>
        </div>
      </div>

      {/* Page title */}
      <div className="relative">
        <div className="flex items-center gap-2">
          {icon ? <span className="flex-shrink-0">{icon}</span> : null}
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            {pageTitle}
          </h1>
        </div>
        {subtitle && (
          <p className="mt-0.5 text-xs text-white/80">{subtitle}</p>
        )}
        {quote && (
          <blockquote className="mt-3 border-l-4 border-white/40 pl-3 text-sm italic text-white/90">
            <p>{quote}</p>
            {quoteSource && (
              <footer className="mt-1 text-xs text-white/70">— {quoteSource}</footer>
            )}
          </blockquote>
        )}
      </div>
    </header>
  );
}
