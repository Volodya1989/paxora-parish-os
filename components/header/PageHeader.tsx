"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import LanguageIconToggle from "@/components/navigation/LanguageIconToggle";
import GivingShortcutButton from "@/components/navigation/GivingShortcutButton";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useNotificationContext } from "@/components/notifications/NotificationProvider";
import SubHeaderBackRow from "@/components/header/SubHeaderBackRow";
import { cn } from "@/lib/ui/cn";
import { sectionThemes, type SectionThemeKey } from "@/lib/theme/sectionTheme";
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
  /** Section-aware theme variant used by header + bottom nav */
  sectionTheme?: SectionThemeKey;
  /** Fallback href for back button. When set, a back row appears below the header. */
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
  gradientClass,
  quote,
  quoteSource,
  icon,
  backHref,
  sectionTheme = "ThisWeek"
}: PageHeaderProps) {
  const { count } = useNotificationContext();
  const locale = useLocale();
  const logoSrc = parishLogoUrl?.trim() ? parishLogoUrl : "/icon.png";
  const theme = sectionThemes[sectionTheme];
  const resolvedGradientClass = gradientClass ?? theme.headerGradient;

  return (
    <div className="-mx-4 -mt-6 md:-mx-8">
      <header
        className={cn(
          "relative overflow-hidden bg-gradient-to-br px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-white md:rounded-b-2xl md:px-6",
          resolvedGradientClass
        )}
      >
        {/* Decorative background elements */}
        <div className={cn("absolute -right-8 -top-8 h-20 w-20 rounded-full", theme.headerAccentBubble)} />
        <div className={cn("absolute -bottom-2 left-1/4 h-12 w-12 rounded-full", theme.headerAccentGlow)} />

        {/* Top bar with parish identity + actions */}
        <div className="relative mb-2 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 text-sm font-semibold text-white">
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
            <span className="min-w-0 max-w-[52vw] text-xs leading-tight sm:max-w-[60vw] sm:text-sm">{parishName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {actions}
            <GivingShortcutButton className="h-8 w-8 border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30" />
            {count > 0 && (
              <NotificationCenter bellClassName="h-8 w-8 border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 md:hidden" />
            )}
            <LanguageIconToggle />
          </div>
        </div>

        {/* Page title */}
        <div className="relative">
          <div className="flex items-center gap-2">
            {icon ? <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full", theme.headerIconBubble)}>{icon}</span> : null}
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">{pageTitle}</h1>
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-white/80">{subtitle}</p>}
          {quote && (
            <blockquote className="mt-3 border-l-4 border-white/40 pl-3 text-sm italic text-white/90">
              <p>{quote}</p>
              {quoteSource && <footer className="mt-1 text-xs text-white/70">— {quoteSource}</footer>}
            </blockquote>
          )}
        </div>
      </header>
      {backHref ? <SubHeaderBackRow backHref={backHref} /> : null}
    </div>
  );
}
