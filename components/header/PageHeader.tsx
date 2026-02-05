"use client";

import { type ReactNode } from "react";
import LanguageIconToggle from "@/components/navigation/LanguageIconToggle";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useNotificationContext } from "@/components/notifications/NotificationProvider";
import { cn } from "@/lib/ui/cn";

type PageHeaderProps = {
  /** Current page title */
  pageTitle: string;
  /** Parish name to display */
  parishName: string;
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
  subtitle,
  actions,
  gradientClass = "from-primary-600 via-primary-500 to-emerald-500",
  quote,
  quoteSource,
  icon
}: PageHeaderProps) {
  const { count } = useNotificationContext();

  return (
    <header
      className={cn(
        "relative -mx-4 -mt-6 overflow-hidden bg-gradient-to-br px-4 pb-4 pt-4 text-white md:-mx-8 md:rounded-b-2xl md:px-6",
        gradientClass
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-2 left-1/4 h-12 w-12 rounded-full bg-white/5" />

      {/* Top bar with breadcrumb and actions */}
      <div className="relative mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <span>{parishName}</span>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {count > 0 && (
            <NotificationCenter bellClassName="h-11 w-11 md:hidden" />
          )}
          <LanguageIconToggle />
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
